# Beauty Sphia Android WebView

The Android app loads the existing Beauty Sphia website in Capacitor's WebView. It does not bundle a second frontend or replace the site's backend, authentication, salon features, or Daraja payment flow.

## Targets and commands

| Target | Site | Android application ID | Local artifact |
| --- | --- | --- | --- |
| Staging | `https://beauty-sphia-staging.vercel.app` | `com.beautysphia.app.staging` | `android/app/build/outputs/apk/staging/beauty-sphia-staging.apk` |
| Production | `BEAUTY_SPHIA_PRODUCTION_URL` (required) | `com.beautysphia.app` | `android/app/build/outputs/apk/production/beauty-sphia.apk` and `android/app/build/outputs/bundle/production/beauty-sphia.aab` |

Run `npm run android:validate:staging` to inspect the staging target. `npm run android:debug` syncs Capacitor and builds/verifies the staging APK. Production URL validation is available with `npm run android:validate:production`; `npm run android:sync:production` syncs its explicit URL after configuration. Production APK/AAB commands are `npm run android:release:apk` and `npm run android:release:aab`.

Production is not deployed yet, so its URL must remain unset until the deployed origin is verified. Release commands also require `BEAUTY_SPHIA_PRODUCTION_RELEASE_ENABLED=1`, an external production keystore, its passwords/alias, and the approved SHA-256 certificate fingerprint. No signing credentials or keys are included in the repository. Production update checks and download manifests remain disabled until a signed release is prepared and approved.

Each native build requires Android SDK/build tools and a Gradle-supported JDK. AAB verification also requires `bundletool` on `PATH` or `BUNDLETOOL_JAR` pointing to its JAR. The build task verifies the generated Capacitor URL, package ID, version, APK/AAB metadata, and signing identity before reporting a release artifact. Bump both Android `versionCode` and `versionName` for every update; the updater refuses packages whose version code is not newer. Android install flows, edge-to-edge/system bar rendering, offline recovery, external browser handoff, file uploads, Google sign-in return, back navigation, and actual installer behavior still require physical-device verification.

## Website integration

The website selects a channel from its exact HTTPS host instead of a generic deployment-environment label: staging is pinned to the confirmed staging origin, production requires `BEAUTY_SPHIA_PRODUCTION_URL`, and unknown hosts show no app download. The website prompts for the channel-specific APK only when its same-origin download path exists. Update checks require a channel-specific manifest and verify the package ID, HTTPS origin/path, increasing version code, and signing certificate through the native updater before offering installation. The checked-in manifests intentionally have `enabled: false` until a release artifact and certificate are approved.

Google sign-in uses the existing Auth.js Google provider through a browser handoff. A short-lived, one-time server ticket returns to the app through the `beautysphia://auth/callback` link; the app exchanges that ticket for its normal Auth.js WebView session. Website credential sign-in and ordinary browser Google sign-in remain available.
