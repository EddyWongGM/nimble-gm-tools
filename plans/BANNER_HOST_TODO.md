# TODO: BannerHost is unwired

[BannerHost.tsx](../client/Layout/BannerHost.tsx) exports a `BannerHost`
component that renders a random affiliate/Patreon `.footer-banner` image
(styled in [tracker.less](../lesscss/pages/tracker.less)), gated so it's
hidden for logged-in Patreon subscribers (`env.IsLoggedIn && (env.HasStorage
|| env.HasEpicInitiative)`).

Nothing in the app currently imports or renders `<BannerHost />` — it isn't
mounted in the tracker layout ([CenterColumn.tsx](../client/Layout/CenterColumn.tsx))
or anywhere else. As it stands it's dead code with no visible effect.

Decide whether to:
- Mount `<BannerHost />` somewhere in the tracker layout so the banners
  actually show, or
- Remove the component if it's no longer wanted.
