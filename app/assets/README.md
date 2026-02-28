# App icon

Use a **Windows .ico** file so the **app executable and shortcuts** get your icon (not just the installer) and so **transparency** is preserved.

## Steps

1. **Convert your PNG to ICO with transparency**
   - Your `icon.png` has a transparent background, but Windows needs a **32-bit .ico with alpha** for transparency. Many converters output a white background instead.
   - Use a converter that keeps transparency, for example:
     - **Online:** [icoconvert.com](https://icoconvert.com/) – upload your PNG, choose “Custom” and keep transparency, then download.
     - **Or:** [convertio.co/png-ico](https://convertio.co/png-ico/) – some settings preserve alpha.
   - Or use **Greenfish Icon Editor Pro** (free) and export as 32-bit ICO with alpha.
   - Recommended size: **256×256** (or include 256 and 48 in the .ico).

2. **Save as `relay-app.ico`** in this folder (`app/assets/`).

3. **Rebuild:** From the `app` folder run `npm run dist`. The new installer, the **Relay Team Builder.exe**, and all shortcuts (desktop, Start Menu) will use your icon with transparency.

4. **After installing:** If the desktop shortcut still shows the old icon, delete the shortcut and create a new one from Start Menu (right‑click “Relay Team Builder” → Open file location → right‑click the .exe → Send to → Desktop). Or restart Explorer / clear the icon cache.

## Current config

The build uses **`assets/relay-app.ico`**. Put your icon in this folder with that exact name. Run `npm run dist` after changing the icon.
