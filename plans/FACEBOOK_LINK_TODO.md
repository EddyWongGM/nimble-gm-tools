# TODO: Facebook link still points to old Improved Initiative branding

[About.tsx](../client/Settings/components/About.tsx) has an `fb-like` widget with:

```
data-href="https://www.facebook.com/improvedinitiativeapp/"
```

This still points to the old Improved Initiative Facebook page. There is no
Nimble RPG App Facebook page yet referenced anywhere else in the codebase.

Once a Nimble RPG App Facebook page exists, update `data-href` in About.tsx
(or remove the widget if no Facebook presence is planned).

Related: Patreon links in the same area (About.tsx, BannerHost.tsx,
TrackerViewModel.tsx) were already updated from
`https://www.patreon.com/join/improvedinitiative` to
`https://www.patreon.com/NimbleRPGApp` to match the rest of the codebase.
