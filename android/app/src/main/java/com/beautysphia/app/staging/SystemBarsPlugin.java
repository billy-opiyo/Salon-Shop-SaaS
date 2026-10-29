package com.beautysphia.app.staging;

import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.FrameLayout;

import androidx.core.view.WindowCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BeautySphiaSystemBars")
public class SystemBarsPlugin extends Plugin {
    private FrameLayout edgeToEdgeBands;
    private View statusBand;
    private View navigationBand;

    @PluginMethod
    public void setColors(PluginCall call) {
        String backgroundValue = call.getString("background");
        Boolean lightIcons = call.getBoolean("lightIcons");
        String surfaceValue = call.getString("surface", backgroundValue);
        String textValue = call.getString("text", "#fff8e8");
        String mutedValue = call.getString("muted", "#c8bda8");
        String primaryValue = call.getString("primary", "#d7a84f");
        if (!isHexColor(backgroundValue) || !isHexColor(surfaceValue) || !isHexColor(textValue)
            || !isHexColor(mutedValue) || !isHexColor(primaryValue) || lightIcons == null) {
            call.reject("The Beauty Sphia theme colors are incomplete or invalid.");
            return;
        }

        final int background = Color.parseColor(backgroundValue);
        getContext().getSharedPreferences("active_theme", Context.MODE_PRIVATE).edit()
            .putString("background", backgroundValue)
            .putString("surface", surfaceValue)
            .putString("text", textValue)
            .putString("muted", mutedValue)
            .putString("primary", primaryValue)
            .putBoolean("light_icons", lightIcons)
            .apply();

        getActivity().runOnUiThread(() -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).applyLaunchTheme(background, Color.parseColor(surfaceValue));
            }
            Window window = getActivity().getWindow();
            View decor = window.getDecorView();
            decor.setBackgroundColor(background);
            if (Build.VERSION.SDK_INT >= 35) {
                WindowCompat.setDecorFitsSystemWindows(window, false);
                window.setStatusBarColor(Color.TRANSPARENT);
                window.setNavigationBarColor(Color.TRANSPARENT);
            } else {
                window.setStatusBarColor(background);
                window.setNavigationBarColor(background);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setStatusBarContrastEnforced(false);
                window.setNavigationBarContrastEnforced(false);
            }
            int bars = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) controller.setSystemBarsAppearance(lightIcons ? 0 : bars, bars);
            } else {
                int flags = decor.getSystemUiVisibility();
                int legacyBars = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                decor.setSystemUiVisibility(lightIcons ? flags & ~legacyBars : flags | legacyBars);
            }
            if (Build.VERSION.SDK_INT >= 35) {
                ensureEdgeToEdgeBands((FrameLayout) decor);
                statusBand.setBackgroundColor(background);
                navigationBand.setBackgroundColor(background);
            }
        });
        call.resolve();
    }

    private boolean isHexColor(String value) {
        return value != null && value.matches("#[0-9a-fA-F]{6}");
    }

    private void ensureEdgeToEdgeBands(FrameLayout decor) {
        if (edgeToEdgeBands != null) return;
        FrameLayout bands = new FrameLayout(getActivity());
        bands.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        bands.setClickable(false);
        bands.setFocusable(false);
        statusBand = new View(getActivity());
        navigationBand = new View(getActivity());
        bands.addView(statusBand, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, 0, android.view.Gravity.TOP));
        bands.addView(navigationBand, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, 0, android.view.Gravity.BOTTOM));
        bands.setOnApplyWindowInsetsListener((view, insets) -> {
            int topInset;
            int bottomInset;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                topInset = bars.top;
                bottomInset = bars.bottom;
            } else {
                topInset = insets.getSystemWindowInsetTop();
                bottomInset = insets.getSystemWindowInsetBottom();
            }
            FrameLayout.LayoutParams top = (FrameLayout.LayoutParams) statusBand.getLayoutParams();
            top.height = topInset;
            statusBand.setLayoutParams(top);
            FrameLayout.LayoutParams bottom = (FrameLayout.LayoutParams) navigationBand.getLayoutParams();
            bottom.height = bottomInset;
            navigationBand.setLayoutParams(bottom);
            return insets;
        });
        decor.addView(bands, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        bands.bringToFront();
        decor.requestApplyInsets();
        edgeToEdgeBands = bands;
    }
}
