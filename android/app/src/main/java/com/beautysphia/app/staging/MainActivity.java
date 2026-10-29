package com.beautysphia.app.staging;

import android.app.DownloadManager;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_INSTALL_PERMISSION = 8012;
    private static final long MIN_LAUNCH_OVERLAY_MS = 2_000L;
    private View nativeLaunchOverlay;
    private ImageView launchLogo;
    private float swipeStartX;
    private float swipeStartY;
    private boolean swipeStartedAtTop;
    private boolean swipeRefreshRejected;
    private long launchStartedAtMs;
    private boolean launchPageLoaded;
    private boolean launchHideScheduled;
    private UpdateDownloadReceiver updateDownloadReceiver;
    private Uri pendingUpdateApk;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(SystemBarsPlugin.class);
        super.onCreate(savedInstanceState);
        launchStartedAtMs = SystemClock.elapsedRealtime();
        android.content.SharedPreferences theme = getSharedPreferences("active_theme", MODE_PRIVATE);
        int background = parseThemeColor(theme.getString("background", null), Color.rgb(23, 18, 12));
        int surface = parseThemeColor(theme.getString("surface", null), Color.rgb(37, 27, 16));
        getWindow().getDecorView().setBackgroundColor(background);
        showNativeLaunchOverlay();
        applyLaunchTheme(background, surface);
    }

    @Override
    protected void load() {
        super.load();
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        webView.setVerticalScrollBarEnabled(false);
        enableSwipeToReload(webView);
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && isConnectionError(error.getErrorCode(), String.valueOf(error.getDescription()))) {
                    showOfflinePage(view, request.getUrl().toString());
                    return;
                }
                super.onReceivedError(view, request, error);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                launchPageLoaded = true;
                scheduleLaunchOverlayHide(view);
            }

            private void showOfflinePage(WebView view, String failedUrl) {
                if (failedUrl == null || failedUrl.isEmpty()) return;
                android.content.SharedPreferences theme = getSharedPreferences("active_theme", MODE_PRIVATE);
                Uri.Builder offline = Uri.parse("file:///android_asset/public/offline.html")
                    .buildUpon()
                    .appendQueryParameter("url", failedUrl);
                for (String key : new String[] {"background", "surface", "text", "muted", "primary"}) {
                    String value = theme.getString(key, null);
                    if (value != null && value.matches("#[0-9a-fA-F]{6}")) offline.appendQueryParameter(key, value);
                }
                view.loadUrl(offline.build().toString());
            }

            private boolean isConnectionError(int code, String description) {
                String normalized = description == null ? "" : description.toLowerCase(Locale.ROOT);
                return code == ERROR_HOST_LOOKUP || code == ERROR_CONNECT || code == ERROR_TIMEOUT
                    || code == ERROR_IO || code == ERROR_FAILED_SSL_HANDSHAKE
                    || normalized.contains("err_internet_disconnected");
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        if (updateDownloadReceiver == null) {
            updateDownloadReceiver = new UpdateDownloadReceiver(this::installDownloadedUpdate);
            IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                registerReceiver(updateDownloadReceiver, filter, android.content.Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(updateDownloadReceiver, filter);
            }
        }
        clearPendingUpdateIfInstalled();
        recoverCompletedUpdateDownload();
    }

    @Override
    public void onPause() {
        if (updateDownloadReceiver != null) {
            unregisterReceiver(updateDownloadReceiver);
            updateDownloadReceiver = null;
        }
        super.onPause();
    }

    private void recoverCompletedUpdateDownload() {
        if (pendingUpdateApk != null || updateDownloadReceiver == null) return;
        android.content.SharedPreferences preferences = getSharedPreferences("app_update", MODE_PRIVATE);
        if (preferences.getBoolean("awaiting_install_permission", false)) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O
                && !getPackageManager().canRequestPackageInstalls()) return;
            preferences.edit().putBoolean("awaiting_install_permission", false)
                .putBoolean("installer_prompt_open", false).commit();
        } else if (preferences.getBoolean("installer_prompt_open", false)) {
            return;
        }
        long downloadId = preferences.getLong("pending_download_id", -1L);
        if (downloadId < 0L) return;
        Intent completed = new Intent(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
            .putExtra(DownloadManager.EXTRA_DOWNLOAD_ID, downloadId);
        updateDownloadReceiver.onReceive(this, completed);
    }

    private void clearPendingUpdateIfInstalled() {
        android.content.SharedPreferences preferences = getSharedPreferences("app_update", MODE_PRIVATE);
        long targetVersion = preferences.getLong("pending_version_code", -1L);
        if (targetVersion < 1L) return;
        try {
            android.content.pm.PackageInfo installed = getPackageManager().getPackageInfo(getPackageName(), 0);
            long installedVersion = androidx.core.content.pm.PackageInfoCompat.getLongVersionCode(installed);
            if (installedVersion >= targetVersion) clearPendingUpdateDownload();
        } catch (android.content.pm.PackageManager.NameNotFoundException ignored) {
            // Keep the download so the user can retry if package lookup is unavailable.
        }
    }

    private void clearPendingUpdateDownload() {
        android.content.SharedPreferences preferences = getSharedPreferences("app_update", MODE_PRIVATE);
        long downloadId = preferences.getLong("pending_download_id", -1L);
        DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (manager != null && downloadId >= 0L) manager.remove(downloadId);
        preferences.edit().clear().apply();
    }

    public void installDownloadedUpdate(Uri apkUri) {
        if (apkUri == null) return;
        android.content.SharedPreferences update = getSharedPreferences("app_update", MODE_PRIVATE);
        if (!UpdateApkVerifier.verifyDownloadedApk(
            this,
            apkUri,
            update.getString("pending_channel", ""),
            update.getString("pending_server_url", ""),
            update.getString("pending_apk_url", ""),
            update.getString("pending_application_id", ""),
            update.getLong("pending_version_code", -1L),
            update.getString("pending_certificate_sha256", "")
        )) {
            clearPendingUpdateDownload();
            android.widget.Toast.makeText(this, "This update does not match Beauty Sphia and was discarded.", android.widget.Toast.LENGTH_LONG).show();
            return;
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O
            && !getPackageManager().canRequestPackageInstalls()) {
            pendingUpdateApk = apkUri;
            update.edit().putBoolean("installer_prompt_open", true).putBoolean("awaiting_install_permission", true).apply();
            Intent settings = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                .setData(Uri.parse("package:" + getPackageName()));
            startActivityForResult(settings, REQUEST_INSTALL_PERMISSION);
            return;
        }
        launchUpdateInstaller(apkUri);
    }

    private void launchUpdateInstaller(Uri apkUri) {
        getSharedPreferences("app_update", MODE_PRIVATE).edit()
            .putBoolean("installer_prompt_open", true)
            .putBoolean("awaiting_install_permission", false)
            .apply();
        Intent installer = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(apkUri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(installer);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_INSTALL_PERMISSION || pendingUpdateApk == null) return;
        Uri apkUri = pendingUpdateApk;
        pendingUpdateApk = null;
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O
            || getPackageManager().canRequestPackageInstalls()) {
            launchUpdateInstaller(apkUri);
        } else {
            getSharedPreferences("app_update", MODE_PRIVATE).edit().putBoolean("installer_prompt_open", false).apply();
            android.widget.Toast.makeText(this, "Allow Beauty Sphia to install updates, then retry from the app.", android.widget.Toast.LENGTH_LONG).show();
        }
    }

    private void showNativeLaunchOverlay() {
        FrameLayout content = findViewById(android.R.id.content);
        if (content == null) return;
        FrameLayout overlay = new FrameLayout(this);
        android.content.SharedPreferences theme = getSharedPreferences("active_theme", MODE_PRIVATE);
        int backgroundColor = parseThemeColor(theme.getString("background", null), Color.rgb(23, 18, 12));
        int surfaceColor = parseThemeColor(theme.getString("surface", null), Color.rgb(37, 27, 16));
        GradientDrawable background = new GradientDrawable();
        background.setColor(surfaceColor);
        overlay.setBackground(background);
        overlay.setClickable(true);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.launch_logo_app);
        logo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        logo.setBackground(createLaunchLogoShape(backgroundColor));
        logo.setClipToOutline(true);
        logo.setElevation(dp(8));
        FrameLayout.LayoutParams logoLayout = new FrameLayout.LayoutParams(dp(90), dp(90), Gravity.CENTER);
        overlay.addView(logo, logoLayout);
        content.addView(overlay, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        nativeLaunchOverlay = overlay;
        launchLogo = logo;
    }

    public void applyLaunchTheme(int backgroundColor, int surfaceColor) {
        getWindow().getDecorView().setBackgroundColor(backgroundColor);
        if (nativeLaunchOverlay != null) {
            GradientDrawable launchBackground = new GradientDrawable();
            launchBackground.setColor(surfaceColor);
            nativeLaunchOverlay.setBackground(launchBackground);
        }
        if (launchLogo != null) launchLogo.setBackground(createLaunchLogoShape(backgroundColor));
    }

    private GradientDrawable createLaunchLogoShape(int surfaceColor) {
        GradientDrawable squircle = new GradientDrawable();
        squircle.setColor(surfaceColor);
        squircle.setCornerRadius(dp(22));
        return squircle;
    }

    private void enableSwipeToReload(WebView webView) {
        final int refreshDistance = dp(84);
        final int touchSlop = ViewConfiguration.get(this).getScaledTouchSlop();
        webView.setOnTouchListener((view, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    swipeStartX = event.getX();
                    swipeStartY = event.getY();
                    swipeStartedAtTop = !webView.canScrollVertically(-1);
                    swipeRefreshRejected = false;
                    break;
                case MotionEvent.ACTION_MOVE:
                    if (swipeStartedAtTop) {
                        float horizontal = Math.abs(event.getX() - swipeStartX);
                        float vertical = event.getY() - swipeStartY;
                        if (horizontal > touchSlop && horizontal > Math.abs(vertical)) {
                            swipeRefreshRejected = true;
                        }
                    }
                    break;
                case MotionEvent.ACTION_POINTER_DOWN:
                case MotionEvent.ACTION_CANCEL:
                    swipeRefreshRejected = true;
                    swipeStartedAtTop = false;
                    break;
                case MotionEvent.ACTION_UP:
                    float distanceY = event.getY() - swipeStartY;
                    float distanceX = Math.abs(event.getX() - swipeStartX);
                    boolean shouldReload = swipeStartedAtTop
                        && !swipeRefreshRejected
                        && distanceY >= refreshDistance
                        && distanceY > distanceX * 1.25f
                        && !webView.canScrollVertically(-1);
                    swipeStartedAtTop = false;
                    swipeRefreshRejected = false;
                    if (shouldReload) {
                        webView.reload();
                        return true;
                    }
                    break;
                default:
                    break;
            }
            return false;
        });
    }

    private void scheduleLaunchOverlayHide(WebView webView) {
        if (!launchPageLoaded || launchHideScheduled || nativeLaunchOverlay == null) return;
        launchHideScheduled = true;
        long elapsed = SystemClock.elapsedRealtime() - launchStartedAtMs;
        long delay = Math.max(0L, MIN_LAUNCH_OVERLAY_MS - elapsed);
        webView.postDelayed(() -> {
            launchHideScheduled = false;
            if (launchPageLoaded) hideNativeLaunchOverlay();
        }, delay);
    }

    private int parseThemeColor(String value, int fallback) {
        try {
            if (value != null && value.matches("#[0-9a-fA-F]{6}")) return Color.parseColor(value);
        } catch (IllegalArgumentException ignored) {
            // Fall back to the app palette if stored theme data is malformed.
        }
        return fallback;
    }

    private void hideNativeLaunchOverlay() {
        if (nativeLaunchOverlay == null) return;
        FrameLayout content = findViewById(android.R.id.content);
        if (content == null) return;
        View overlay = nativeLaunchOverlay;
        nativeLaunchOverlay = null;
        launchLogo = null;
        overlay.animate().alpha(0f).setDuration(180).withEndAction(() -> content.removeView(overlay)).start();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
