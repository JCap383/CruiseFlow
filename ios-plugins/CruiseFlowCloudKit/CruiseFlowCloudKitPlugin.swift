import Capacitor
import CloudKit
import SQLite3

/**
 * CruiseFlowCloudKit — Capacitor plugin for iCloud sync via CKSyncEngine.
 *
 * Architecture:
 *   JS (platform/native.ts) ←→ Capacitor Bridge ←→ This Plugin ←→ CKSyncEngine ←→ CloudKit
 *
 * The plugin reads from the _sync_changes SQLite table to know what local
 * changes need to be pushed, and writes incoming CloudKit changes to SQLite.
 */
@available(iOS 17.0, *)
@objc(CruiseFlowCloudKitPlugin)
public class CruiseFlowCloudKitPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "CruiseFlowCloudKitPlugin"
    public let jsName = "CruiseFlowCloudKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLastSyncTime", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareCruise", returnType: CAPPluginReturnPromise),
    ]

    // MARK: - Configuration

    private let containerIdentifier = "iCloud.com.cruiseflow.app"
    private let zoneName = "CruiseFlowZone"
    private let stateKey = "CKSyncEngineState"

    private var syncEngine: CKSyncEngine?
    private var currentStatus: String = "offline"

    // CKRecord type names matching SQLite tables
    private enum RecordType {
        static let cruise = "Cruise"
        static let event = "CruiseEvent"
        static let member = "FamilyMember"
    }

    // MARK: - Lifecycle

    override public func load() {
        super.load()
        Task {
            await initializeSyncEngine()
        }
    }

    // MARK: - JS Bridge Methods

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve(["status": currentStatus])
    }

    @objc func getLastSyncTime(_ call: CAPPluginCall) {
        let ts = UserDefaults.standard.object(forKey: "cruiseflow-last-sync-time") as? Double
        call.resolve(["timestamp": ts as Any])
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard let engine = syncEngine else {
            call.resolve()
            return
        }
        Task {
            setStatus("syncing")
            engine.fetchChanges()
            try? engine.sendChanges()
            call.resolve()
        }
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        Task {
            let available = await checkiCloudAvailability()
            call.resolve(["available": available])
        }
    }

    @objc func shareCruise(_ call: CAPPluginCall) {
        guard let cruiseId = call.getString("cruiseId") else {
            call.reject("Missing cruiseId")
            return
        }

        let container = CKContainer(identifier: containerIdentifier)
        let zoneID = CKRecordZone.ID(zoneName: zoneName, ownerName: CKCurrentUserDefaultName)
        let recordID = CKRecord.ID(recordName: cruiseId, zoneID: zoneID)

        Task {
            do {
                // Fetch the cruise record to share
                let record = try await container.privateCloudDatabase.record(for: recordID)

                // Create a share for this record
                let share = CKShare(rootRecord: record)
                share[CKShare.SystemFieldKey.title] = "CruiseFlow Cruise" as CKRecordValue
                share.publicPermission = .readWrite

                // Save the share
                let modOp = CKModifyRecordsOperation(recordsToSave: [record, share])
                modOp.modifyRecordsResultBlock = { result in
                    switch result {
                    case .success:
                        // Present the sharing controller on the main thread
                        DispatchQueue.main.async {
                            guard let viewController = self.bridge?.viewController else {
                                call.reject("No view controller")
                                return
                            }
                            let sharingController = UICloudSharingController(share: share, container: container)
                            sharingController.availablePermissions = [.allowReadWrite, .allowPrivate]
                            viewController.present(sharingController, animated: true) {
                                call.resolve()
                            }
                        }
                    case .failure(let error):
                        call.reject("Failed to create share: \(error.localizedDescription)")
                    }
                }
                container.privateCloudDatabase.add(modOp)
            } catch {
                call.reject("Failed to share cruise: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Sync Engine Initialization

    private func initializeSyncEngine() async {
        let available = await checkiCloudAvailability()
        guard available else {
            setStatus("unavailable")
            return
        }

        let container = CKContainer(identifier: containerIdentifier)
        let database = container.privateCloudDatabase
        let zone = CKRecordZone(zoneName: zoneName)

        // Restore persisted sync engine state
        let previousState: CKSyncEngine.State.Serialization?
        if let data = UserDefaults.standard.data(forKey: stateKey) {
            previousState = try? NSKeyedUnarchiver.unarchivedObject(
                ofClass: CKSyncEngine.State.Serialization.self,
                from: data
            )
        } else {
            previousState = nil
        }

        let config = CKSyncEngine.Configuration(
            database: database,
            stateSerialization: previousState,
            delegate: self
        )

        syncEngine = CKSyncEngine(config)

        // Ensure our custom zone exists
        let zoneOp = CKModifyRecordZonesOperation(recordZonesToSave: [zone])
        database.add(zoneOp)

        setStatus("synced")
    }

    // MARK: - Helpers

    private func checkiCloudAvailability() async -> Bool {
        do {
            let status = try await CKContainer(identifier: containerIdentifier).accountStatus()
            return status == .available
        } catch {
            return false
        }
    }

    private func setStatus(_ status: String) {
        currentStatus = status
        notifyListeners("syncStatusChanged", data: ["status": status])
    }

    private func recordLastSync() {
        let ts = Date().timeIntervalSince1970 * 1000
        UserDefaults.standard.set(ts, forKey: "cruiseflow-last-sync-time")
    }

    // MARK: - SQLite Access (read _sync_changes, write records)

    private func getDbPath() -> String? {
        let paths = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)
        let dbDir = paths[0].appendingPathComponent("CapacitorDatabase")
        return dbDir.appendingPathComponent("cruiseflowSQLite.db").path
    }

    private func openDb() -> OpaquePointer? {
        guard let path = getDbPath() else { return nil }
        var db: OpaquePointer?
        guard sqlite3_open(path, &db) == SQLITE_OK else { return nil }
        return db
    }

    /// Read pending changes from _sync_changes table
    private func getPendingChanges() -> [(id: Int64, table: String, recordId: String, changeType: String)] {
        guard let db = openDb() else { return [] }
        defer { sqlite3_close(db) }

        var changes: [(id: Int64, table: String, recordId: String, changeType: String)] = []
        var stmt: OpaquePointer?
        let sql = "SELECT id, tableName, recordId, changeType FROM _sync_changes WHERE synced = 0 ORDER BY timestamp"

        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            while sqlite3_step(stmt) == SQLITE_ROW {
                let id = sqlite3_column_int64(stmt, 0)
                let table = String(cString: sqlite3_column_text(stmt, 1))
                let recordId = String(cString: sqlite3_column_text(stmt, 2))
                let changeType = String(cString: sqlite3_column_text(stmt, 3))
                changes.append((id: id, table: table, recordId: recordId, changeType: changeType))
            }
        }
        sqlite3_finalize(stmt)
        return changes
    }

    /// Mark sync changes as synced
    private func markChangesSynced(_ ids: [Int64]) {
        guard !ids.isEmpty, let db = openDb() else { return }
        defer { sqlite3_close(db) }

        let placeholders = ids.map { _ in "?" }.joined(separator: ",")
        let sql = "UPDATE _sync_changes SET synced = 1 WHERE id IN (\(placeholders))"
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            for (i, id) in ids.enumerated() {
                sqlite3_bind_int64(stmt, Int32(i + 1), id)
            }
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)
    }

    /// Read a record from SQLite to convert to CKRecord
    private func readRecord(table: String, recordId: String) -> [String: Any]? {
        guard let db = openDb() else { return nil }
        defer { sqlite3_close(db) }

        var stmt: OpaquePointer?
        let sql = "SELECT * FROM \(table) WHERE id = ?"

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return nil }
        sqlite3_bind_text(stmt, 1, (recordId as NSString).utf8String, -1, nil)

        var result: [String: Any]?
        if sqlite3_step(stmt) == SQLITE_ROW {
            var row: [String: Any] = [:]
            let colCount = sqlite3_column_count(stmt)
            for i in 0..<colCount {
                let name = String(cString: sqlite3_column_name(stmt, i))
                let type = sqlite3_column_type(stmt, i)
                switch type {
                case SQLITE_TEXT:
                    row[name] = String(cString: sqlite3_column_text(stmt, i))
                case SQLITE_INTEGER:
                    row[name] = sqlite3_column_int64(stmt, i)
                case SQLITE_FLOAT:
                    row[name] = sqlite3_column_double(stmt, i)
                case SQLITE_NULL:
                    row[name] = NSNull()
                default:
                    break
                }
            }
            result = row
        }
        sqlite3_finalize(stmt)
        return result
    }

    /// Convert a CKRecord type name to SQLite table name
    private func tableForRecordType(_ type: String) -> String {
        switch type {
        case RecordType.cruise: return "cruises"
        case RecordType.event: return "events"
        case RecordType.member: return "members"
        default: return type
        }
    }

    /// Convert SQLite table name to CKRecord type
    private func recordTypeForTable(_ table: String) -> String {
        switch table {
        case "cruises": return RecordType.cruise
        case "events": return RecordType.event
        case "members": return RecordType.member
        default: return table
        }
    }

    /// Build a CKRecord from SQLite row data
    private func buildCKRecord(type: String, id: String, data: [String: Any]) -> CKRecord {
        let zoneID = CKRecordZone.ID(zoneName: zoneName, ownerName: CKCurrentUserDefaultName)
        let recordID = CKRecord.ID(recordName: id, zoneID: zoneID)
        let record = CKRecord(recordType: type, recordID: recordID)

        for (key, value) in data where key != "id" {
            if let str = value as? String {
                record[key] = str as CKRecordValue
            } else if let num = value as? Int64 {
                record[key] = NSNumber(value: num)
            } else if let dbl = value as? Double {
                record[key] = NSNumber(value: dbl)
            }
        }
        return record
    }

    /// Apply an incoming CKRecord to SQLite
    private func applyRemoteRecord(_ record: CKRecord) {
        let table = tableForRecordType(record.recordType)
        let recordId = record.recordID.recordName

        guard let db = openDb() else { return }
        defer { sqlite3_close(db) }

        // Build column values from the CKRecord
        var columns: [String] = ["id"]
        var placeholders: [String] = ["?"]
        var values: [Any] = [recordId]

        for key in record.allKeys() {
            columns.append(key)
            placeholders.append("?")
            if let value = record[key] {
                values.append(value)
            } else {
                values.append(NSNull())
            }
        }

        let sql = "INSERT OR REPLACE INTO \(table) (\(columns.joined(separator: ","))) VALUES (\(placeholders.joined(separator: ",")))"
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            for (i, val) in values.enumerated() {
                let idx = Int32(i + 1)
                if let str = val as? String {
                    sqlite3_bind_text(stmt, idx, (str as NSString).utf8String, -1, nil)
                } else if let num = val as? NSNumber {
                    sqlite3_bind_int64(stmt, idx, num.int64Value)
                } else {
                    sqlite3_bind_null(stmt, idx)
                }
            }
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)
    }

    /// Delete a record from SQLite by CKRecord ID
    private func deleteRemoteRecord(type: String, id: String) {
        let table = tableForRecordType(type)
        guard let db = openDb() else { return }
        defer { sqlite3_close(db) }

        var stmt: OpaquePointer?
        let sql = "DELETE FROM \(table) WHERE id = ?"
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, nil)
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)
    }
}

// MARK: - CKSyncEngineDelegate

@available(iOS 17.0, *)
extension CruiseFlowCloudKitPlugin: CKSyncEngineDelegate {

    public func handleEvent(_ event: CKSyncEngine.Event, syncEngine: CKSyncEngine) {
        switch event {
        case .stateUpdate(let stateUpdate):
            // Persist sync engine state for next launch
            if let data = try? NSKeyedArchiver.archivedData(
                withRootObject: stateUpdate.stateSerialization,
                requiringSecureCoding: true
            ) {
                UserDefaults.standard.set(data, forKey: stateKey)
            }

        case .accountChange(let accountChange):
            // Handle iCloud account changes (sign in/out/switch)
            switch accountChange.changeType {
            case .signIn:
                setStatus("syncing")
            case .signOut:
                setStatus("unavailable")
            case .switchAccounts:
                setStatus("syncing")
            @unknown default:
                break
            }

        case .fetchedDatabaseChanges(let dbChanges):
            // New or modified record zones
            for mod in dbChanges.modifications {
                _ = mod.zoneID // We use a single zone, just acknowledge
            }

        case .fetchedRecordZoneChanges(let zoneChanges):
            // Apply incoming records from iCloud
            for mod in zoneChanges.modifications {
                applyRemoteRecord(mod.record)
            }
            for del in zoneChanges.deletions {
                deleteRemoteRecord(type: del.recordType, id: del.recordID.recordName)
            }
            // Notify JS that data changed
            notifyListeners("remoteDataChanged", data: [:])

        case .sentDatabaseChanges:
            break

        case .sentRecordZoneChanges(let sentChanges):
            // Mark successfully sent changes as synced
            var syncedIds: [Int64] = []
            for saved in sentChanges.savedRecords {
                let table = tableForRecordType(saved.recordType)
                let recordId = saved.recordID.recordName
                // Find matching _sync_changes entries
                let pending = getPendingChanges()
                for change in pending where change.table == table && change.recordId == recordId {
                    syncedIds.append(change.id)
                }
            }
            if !syncedIds.isEmpty {
                markChangesSynced(syncedIds)
            }

        case .willFetchChanges:
            setStatus("syncing")

        case .didFetchChanges:
            setStatus("synced")
            recordLastSync()

        case .willSendChanges:
            setStatus("syncing")

        case .didSendChanges:
            setStatus("synced")
            recordLastSync()

        @unknown default:
            break
        }
    }

    public func nextRecordZoneChangeBatch(
        _ context: CKSyncEngine.SendChangesContext,
        syncEngine: CKSyncEngine
    ) -> CKSyncEngine.RecordZoneChangeBatch? {
        let pendingChanges = getPendingChanges()
        if pendingChanges.isEmpty { return nil }

        let zoneID = CKRecordZone.ID(zoneName: zoneName, ownerName: CKCurrentUserDefaultName)

        var recordsToSave: [CKRecord] = []
        var recordIDsToDelete: [CKRecord.ID] = []

        for change in pendingChanges {
            let ckType = recordTypeForTable(change.table)
            let recordID = CKRecord.ID(recordName: change.recordId, zoneID: zoneID)

            if change.changeType == "delete" {
                recordIDsToDelete.append(recordID)
            } else {
                // insert or update — read from SQLite and build CKRecord
                if let data = readRecord(table: change.table, recordId: change.recordId) {
                    let record = buildCKRecord(type: ckType, id: change.recordId, data: data)
                    recordsToSave.append(record)
                }
            }
        }

        return CKSyncEngine.RecordZoneChangeBatch(
            recordsToSave: recordsToSave,
            recordIDsToDelete: recordIDsToDelete,
            atomicByZone: true
        )
    }
}
