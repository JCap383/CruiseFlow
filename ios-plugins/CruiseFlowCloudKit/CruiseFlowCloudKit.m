// Capacitor plugin registration for CruiseFlowCloudKit
// This Objective-C bridge file is required by Capacitor to register the plugin.

#import <Capacitor/Capacitor.h>

CAP_PLUGIN(CruiseFlowCloudKitPlugin, "CruiseFlowCloudKit",
    CAP_PLUGIN_METHOD(getStatus, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getLastSyncTime, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(sync, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(shareCruise, CAPPluginReturnPromise);
)
