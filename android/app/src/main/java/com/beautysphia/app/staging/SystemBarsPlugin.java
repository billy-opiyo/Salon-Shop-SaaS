package com.beautysphia.app.staging;

import android.content.Context;
import android.graphics.Color;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BeautySphiaSystemBars")
public class SystemBarsPlugin extends Plugin {
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
                ((MainActivity) getActivity()).applyLaunchTheme(
                    background,
                    Color.parseColor(surfaceValue),
                    Color.parseColor(primaryValue),
                    lightIcons
                );
            }
        });
        call.resolve();
    }

    private boolean isHexColor(String value) {
        return value != null && value.matches("#[0-9a-fA-F]{6}");
    }

}
