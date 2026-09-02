import * as React from "react";
import { env } from "../Environment";
import { Metrics } from "../Utility/Metrics";
import * as _ from "lodash";

export function BannerHost(): JSX.Element {
  const [bannerIndex, setBannerIndex] = React.useState(null);
  React.useEffect(() => {
    setBannerIndex(_.random(0, Banners.length - 1));
  }, []);

  const banner = Banners[bannerIndex];

  if (bannerIndex === null) {
    return null;
  }

  if (
    env.IsLoggedIn &&
    (env.HasStorage || env.HasEpicInitiative || env.HasMythic)
  ) {
    return null;
  }

  return (
    <div className="footer-banner">
      <a
        href={banner.href}
        target="_blank"
        onClick={() => {
          Metrics.TrackAnonymousEvent(Metrics.Event.BannerClick, {
            href: banner.href,
            image_url: banner.src
          });

          Metrics.TrackPatreonSignupIntent(Metrics.LeadSource.FooterBanner, {
            link_url: banner.href,
            creative_name: banner.src
          });
        }}
        title="Support the free app on Patreon. Hidden for subscribed Patrons."
      >
        <img src={banner.src} alt={banner.altText} />
      </a>
    </div>
  );
}

const Banners: { href: string; src: string; altText: string }[] = [
  {
    href: "https://www.patreon.com/join/NimbleRPGApp",
    src: "../img/become_a_patron_button.png",
    altText: "Become a Patron"
  },
  {
    href: "https://www.patreon.com/join/NimbleRPGApp",
    src: "../img/pledge-orange.png",
    altText: "Support Nimble RPG App on Patreon"
  }
];
