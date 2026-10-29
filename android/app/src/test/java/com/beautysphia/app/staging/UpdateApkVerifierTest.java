package com.beautysphia.app.staging;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class UpdateApkVerifierTest {
    @Test
    public void stagingUpdatesRequireTheStagingAppAndOrigin() {
        assertEquals(UpdateApkVerifier.STAGING_CHANNEL, UpdateApkVerifier.channelForServerUrl(
            "https://beauty-sphia-staging.vercel.app", UpdateApkVerifier.STAGING_APP_ID));
        assertNull(UpdateApkVerifier.channelForServerUrl(
            "https://beauty-sphia-staging.vercel.app", UpdateApkVerifier.PRODUCTION_APP_ID));
        assertTrue(UpdateApkVerifier.isAllowedApkUrl(
            UpdateApkVerifier.STAGING_CHANNEL,
            "https://beauty-sphia-staging.vercel.app",
            "https://beauty-sphia-staging.vercel.app/downloads/beauty-sphia-staging.apk?v=2",
            UpdateApkVerifier.STAGING_APP_ID));
        assertFalse(UpdateApkVerifier.isAllowedApkUrl(
            UpdateApkVerifier.STAGING_CHANNEL,
            "https://beauty-sphia-staging.vercel.app",
            "https://example.com/downloads/beauty-sphia-staging.apk",
            UpdateApkVerifier.STAGING_APP_ID));
    }

    @Test
    public void productionUpdatesCannotUseStagingIdentityOrPath() {
        assertTrue(UpdateApkVerifier.isAllowedApkUrl(
            UpdateApkVerifier.PRODUCTION_CHANNEL,
            "https://beauty-sphia.example",
            "https://beauty-sphia.example/downloads/beauty-sphia.apk?v=2",
            UpdateApkVerifier.PRODUCTION_APP_ID));
        assertFalse(UpdateApkVerifier.isAllowedApkUrl(
            UpdateApkVerifier.PRODUCTION_CHANNEL,
            "https://beauty-sphia.example",
            "https://beauty-sphia.example/downloads/beauty-sphia-staging.apk",
            UpdateApkVerifier.PRODUCTION_APP_ID));
    }

    @Test
    public void certificateFingerprintParserRejectsMalformedValues() {
        assertEquals("ab".repeat(32), UpdateApkVerifier.normalizeSha256("AB:".repeat(31) + "AB"));
        assertNull(UpdateApkVerifier.normalizeSha256("not-a-sha256"));
    }
}
