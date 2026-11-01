/**
 * App Version & Update Controller
 * Serves version manifest for native APK checks and over-the-air updates.
 */

// Default metadata for TimberBooks v1.0.3
const APP_VERSION_CONFIG = {
  latestVersion: process.env.APP_LATEST_VERSION || '1.0.3',
  latestVersionCode: parseInt(process.env.APP_LATEST_VERSION_CODE || '5', 10),
  minSupportedVersion: '1.0.0',
  minSupportedVersionCode: 1,
  mandatory: false,
  releaseDate: '2026-11-02',
  releaseNotes: [
    'Pixel-perfect layout across all phone screen sizes and tablets.',
    'Complete safe-area insets & solid status bar on Android and iOS.',
    'Timber dimension 2x2 grid adaptation on compact phone screens.',
    'Balanced Quick Entry tile grid with zero empty spaces.',
    'Direct in-app update checks & EAS over-the-air (OTA) updates.'
  ].join('\n'),
  apkUrl: process.env.APP_APK_URL || 'https://expo.dev/artifacts/eas/If8waEjmvIok-6MCmC1Z1fuZkNFUhIIwBzXldxiPBdY.apk',
  easProjectId: 'eb6e72c1-c8c7-45e2-a2b1-8538123945f5',
  channel: 'production'
};

exports.getAppVersion = async (req, res) => {
  try {
    const clientVersion = req.query.version;
    const clientCode = parseInt(req.query.versionCode || '0', 10);

    const updateAvailable = clientCode > 0
      ? clientCode < APP_VERSION_CONFIG.latestVersionCode
      : false;

    const isMandatory = clientCode > 0
      ? clientCode < APP_VERSION_CONFIG.minSupportedVersionCode
      : false;

    return res.json({
      success: true,
      latestVersion: APP_VERSION_CONFIG.latestVersion,
      latestVersionCode: APP_VERSION_CONFIG.latestVersionCode,
      minSupportedVersion: APP_VERSION_CONFIG.minSupportedVersion,
      mandatory: isMandatory,
      updateAvailable: updateAvailable,
      releaseDate: APP_VERSION_CONFIG.releaseDate,
      releaseNotes: APP_VERSION_CONFIG.releaseNotes,
      apkUrl: APP_VERSION_CONFIG.apkUrl,
      easProjectId: APP_VERSION_CONFIG.easProjectId,
      channel: APP_VERSION_CONFIG.channel
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve app version info',
      error: err.message
    });
  }
};
