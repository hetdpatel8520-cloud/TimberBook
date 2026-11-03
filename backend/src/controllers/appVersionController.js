/**
 * App Version & Update Controller
 * Serves version manifest for native APK checks and over-the-air updates.
 */

// Default metadata for TimberBooks v1.0.4
const APP_VERSION_CONFIG = {
  latestVersion: process.env.APP_LATEST_VERSION || '1.0.4',
  latestVersionCode: parseInt(process.env.APP_LATEST_VERSION_CODE || '6', 10),
  minSupportedVersion: '1.0.0',
  minSupportedVersionCode: 1,
  mandatory: false,
  releaseDate: '2026-11-03',
  releaseNotes: [
    'Multi-Company Support: One owner can now manage multiple companies/saw mills.',
    'Company Switcher: Tap company name on dashboard to switch businesses instantly.',
    'Vouchers fix: Receipt, Payment, and Contra each have distinct screens and counters.',
    'Real OTP delivery: Secure email & SMS verification without on-screen codes.',
    'Pixel-perfect layout across all phone screen sizes and safe areas.'
  ].join('\n'),
  apkUrl: process.env.APP_APK_URL || 'https://expo.dev/artifacts/eas/uER7B45Es_GimKV22ybkH36JdTmVn7T4fDibee75JNk.apk',
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
