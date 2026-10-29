package com.beautysphia.app.staging;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;

import androidx.core.content.pm.PackageInfoCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** Verifies update channel, origin, package, version, and signer before installation. */
final class UpdateApkVerifier {
    static final String STAGING_CHANNEL = "staging";
    static final String PRODUCTION_CHANNEL = "production";
    static final String STAGING_APP_ID = "com.beautysphia.app.staging";
    static final String PRODUCTION_APP_ID = "com.beautysphia.app";
    static final String STAGING_HOST = "beauty-sphia-staging.vercel.app";
    static final String STAGING_APK_PATH = "/downloads/beauty-sphia-staging.apk";
    static final String PRODUCTION_APK_PATH = "/downloads/beauty-sphia.apk";

    private UpdateApkVerifier() {}

    static boolean packageIdMatches(String channel, String packageId) {
        return STAGING_CHANNEL.equals(channel) ? STAGING_APP_ID.equals(packageId)
            : PRODUCTION_CHANNEL.equals(channel) && PRODUCTION_APP_ID.equals(packageId);
    }

    static String channelForServerUrl(String serverUrl, String packageId) {
        Uri server = Uri.parse(serverUrl == null ? "" : serverUrl);
        if (!"https".equalsIgnoreCase(server.getScheme()) || server.getHost() == null
            || server.getUserInfo() != null || (server.getPort() != -1 && server.getPort() != 443)
            || (server.getPath() != null && !server.getPath().isEmpty() && !"/".equals(server.getPath()))
            || server.getQuery() != null || server.getFragment() != null) return null;
        if (STAGING_APP_ID.equals(packageId) && STAGING_HOST.equalsIgnoreCase(server.getHost())) return STAGING_CHANNEL;
        if (PRODUCTION_APP_ID.equals(packageId) && !STAGING_HOST.equalsIgnoreCase(server.getHost())) return PRODUCTION_CHANNEL;
        return null;
    }

    static boolean isAllowedApkUrl(String channel, String serverUrl, String apkUrl, String packageId) {
        if (!packageIdMatches(channel, packageId) || !channel.equals(channelForServerUrl(serverUrl, packageId)) || apkUrl == null) return false;
        Uri server = Uri.parse(serverUrl);
        Uri apk = Uri.parse(apkUrl);
        String expectedPath = STAGING_CHANNEL.equals(channel) ? STAGING_APK_PATH : PRODUCTION_APK_PATH;
        return "https".equalsIgnoreCase(apk.getScheme())
            && apk.getUserInfo() == null
            && (apk.getPort() == -1 || apk.getPort() == 443)
            && server.getHost().equalsIgnoreCase(apk.getHost())
            && expectedPath.equals(apk.getPath())
            && apk.getFragment() == null;
    }

    static String normalizeSha256(String value) {
        if (value == null) return null;
        String normalized = value.replace(":", "").replace(" ", "").trim().toLowerCase(Locale.ROOT);
        return normalized.matches("[0-9a-f]{64}") ? normalized : null;
    }

    static Set<String> signerFingerprints(PackageInfo packageInfo) throws Exception {
        Signature[] signatures;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            if (packageInfo.signingInfo == null) return new HashSet<>();
            signatures = packageInfo.signingInfo.getApkContentsSigners();
        } else {
            signatures = packageInfo.signatures;
        }
        Set<String> fingerprints = new HashSet<>();
        if (signatures == null || signatures.length == 0) return fingerprints;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        for (Signature signature : signatures) {
            byte[] hash = digest.digest(signature.toByteArray());
            StringBuilder value = new StringBuilder(hash.length * 2);
            for (byte item : hash) value.append(String.format(Locale.ROOT, "%02x", item & 0xff));
            fingerprints.add(value.toString());
        }
        return fingerprints;
    }

    static boolean installedSignerMatches(Context context, String packageId, String expectedCertificateSha256) {
        String expected = normalizeSha256(expectedCertificateSha256);
        if (expected == null || !context.getPackageName().equals(packageId)) return false;
        try {
            Set<String> fingerprints = signerFingerprints(getPackageInfo(context.getPackageManager(), packageId));
            return fingerprints.size() == 1 && fingerprints.contains(expected);
        } catch (Exception ignored) {
            return false;
        }
    }

    static boolean verifyDownloadedApk(
        Context context,
        Uri downloadUri,
        String channel,
        String appServerUrl,
        String apkUrl,
        String packageId,
        long expectedVersionCode,
        String expectedCertificateSha256
    ) {
        String expectedCertificate = normalizeSha256(expectedCertificateSha256);
        if (downloadUri == null || expectedCertificate == null || !packageIdMatches(channel, packageId)
            || !packageId.equals(context.getPackageName()) || expectedVersionCode < 1L
            || !isAllowedApkUrl(channel, appServerUrl, apkUrl, packageId)
            || !installedSignerMatches(context, packageId, expectedCertificate)) return false;

        File cachedApk = null;
        try (InputStream input = context.getContentResolver().openInputStream(downloadUri)) {
            if (input == null) return false;
            cachedApk = File.createTempFile("beauty-sphia-update-", ".apk", context.getCacheDir());
            try (OutputStream output = new FileOutputStream(cachedApk)) {
                byte[] buffer = new byte[16 * 1024];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            }
            PackageManager packageManager = context.getPackageManager();
            PackageInfo candidate = getArchiveInfo(packageManager, cachedApk.getAbsolutePath());
            if (candidate == null || !packageId.equals(candidate.packageName)
                || PackageInfoCompat.getLongVersionCode(candidate) != expectedVersionCode) return false;
            Set<String> candidateSigners = signerFingerprints(candidate);
            Set<String> installedSigners = signerFingerprints(getPackageInfo(packageManager, packageId));
            return candidateSigners.size() == 1 && installedSigners.size() == 1
                && candidateSigners.contains(expectedCertificate) && candidateSigners.equals(installedSigners);
        } catch (Exception ignored) {
            return false;
        } finally {
            if (cachedApk != null && cachedApk.exists()) cachedApk.delete();
        }
    }

    private static PackageInfo getPackageInfo(PackageManager packageManager, String packageId) throws PackageManager.NameNotFoundException {
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        return packageManager.getPackageInfo(packageId, flags);
    }

    private static PackageInfo getArchiveInfo(PackageManager packageManager, String apkPath) {
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        return packageManager.getPackageArchiveInfo(apkPath, flags);
    }
}
