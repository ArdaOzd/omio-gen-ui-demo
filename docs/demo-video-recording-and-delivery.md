# Demo video recording and delivery

Date: 2026-10-09

## Recommendation

For a first message to someone at an unknown company, use one primary destination: an unlisted YouTube watch page. Put a still image in Gmail, then repeat the full visible `youtube.com/watch` URL in a text link. Unlisted videos play without a Google account, but anyone with the link can reshare it. YouTube may show ads even when the uploader has not monetized the video. This works for an ordinary product demo, not sensitive material. [YouTube visibility](https://support.google.com/youtube/answer/157177), [YouTube ads](https://support.google.com/youtube/answer/2475463)

This is a judgment about recipient convenience and domain familiarity, not proof that a company permits YouTube. Microsoft Defender can scan links at delivery and click time and sandbox attachments. No host universally passes enterprise protections. Only the recipient's policy or IT team can establish what is allowed. Use a direct URL without a shortener or tracking parameters. [Safe Links](https://learn.microsoft.com/en-us/defender-office-365/safe-links-about), [Safe Attachments](https://learn.microsoft.com/en-us/defender-office-365/safe-attachments-about)

For the cleanest ad-free presentation with full page-content control, publish a public GitHub Pages site that plays a native MP4. Include a title, project context, poster, native controls, reviewed captions or transcript, and an optional direct YouTube alternative. Omit analytics, forms, autoplay, and third-party scripts. A YouTube privacy-enhanced embed is still not ad-free. Pages is public even when its source repository is private. Enforce HTTPS. GitHub sets a 1 GB maximum published-site size, recommends a 1 GB source-repository limit, and applies a 100 GB monthly bandwidth soft limit; regular Git objects stop at 100 MiB, browser uploads at 25 MiB, and Git LFS cannot serve Pages. [YouTube privacy-enhanced embeds](https://support.google.com/youtube/answer/171780), [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits), [Git LFS and Pages](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage), [Pages visibility](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

## Delivery options

The trust and security assessments below are judgment calls for an unknown corporate recipient. Actual company policy takes precedence.

| Option | Recipient experience | Privacy and control | Practical limits | Judgment |
| --- | --- | --- | --- | --- |
| YouTube unlisted | Familiar watch page, adaptive playback, no account required | Link can be reshared; ads may appear; review automatic captions before sending | Verified accounts can upload up to 256 GB or 12 hours, whichever is less; YouTube recommends MP4 with H.264 video and AAC audio | Best default for first outreach because it minimizes playback friction, subject to company policy |
| YouTube public | Familiar playback plus discovery | Public and discoverable; ads may appear | Same limits and encoding guidance as unlisted | Use when portfolio reach matters more than controlled circulation |
| YouTube private | Access is limited to invited accounts | Stronger access control than unlisted | Recipient must use an invited Google account, which adds significant friction | Poor first-contact choice; useful only when identities are known |
| GitHub Pages with native MP4 | Branded, direct, ad-free page with native controls and captions | Public; full control over page content; no third-party scripts needed | Published site maximum 1 GB; source repository recommended below 1 GB; video below Git's 100 MiB limit; browser uploads stop at 25 MiB and LFS cannot serve Pages | Best passive presentation when polish and control matter more than obscurity |
| GitHub issue, pull request, comment, or README link | Video sits beside technical discussion or source | Public or repository-scoped according to the repository | Upload through a supported issue, pull request, or comment surface, then link the asset from a README; limits are 10 MB in free-plan-owned repositories and 100 MB in paid-plan-owned repositories for qualifying uploaders | Useful as supporting evidence, not an elegant primary destination |
| GitHub Release download | Stable versioned asset and durable URL | Follows repository/release visibility | Each release asset must be under 2 GiB; a release can have up to 1,000 assets | Good for downloadable masters; weak for click-and-watch outreach |
| Google Drive, anyone with link | Browser preview and download, often without sign-in | Link can be forwarded; anonymous playback may later require sign-in | Cookies or view limits can interrupt playback | Reasonable fallback, but less predictable than YouTube |
| Google Drive, restricted | Familiar enterprise file sharing | Explicit people or organization only | Requires the recipient to use the permitted identity | Appropriate for sensitive content after the recipient is known |
| Small MP4 attachment | No external destination; file stays with the message | Mail security can sandbox it; forwarded mail carries the file | Personal Gmail limits attachments to 25 MB. Current Workspace Enterprise Plus Gmail web allows up to 50 MB, while the other listed tiers remain at 25 MB. Recipient limits may be lower. Preview can fail and require download | Keep only as an optional fallback below about 20 MB, not the primary delivery |
| Inline GIF | Starts quickly in clients that load images | No audio, weak accessibility, easy to forward | Large for its quality; images can be suppressed by the recipient or administrator | Use only as a short teaser, never as the complete demo |
| Loom | Purpose-built browser playback and easy sharing | Link sharing is public by default; password protection is paid | Free plan lists 25 videos, 5 minutes each, at 720p | Convenient if already used, but adds another unfamiliar host and account surface |
| Vimeo | Polished, ad-free playback | Paid plans add unlisted and password controls | The current free plan provides 1 GB lifetime storage for new accounts | Strong controlled alternative when its paid privacy settings are already available |
| Existing self-hosted HTTPS page | Matches an established portfolio domain | Full content and logging control, with security responsibility | Requires a maintained domain, TLS, bandwidth, and video delivery | Best when the recipient already trusts the domain |

Sources for the table: [YouTube visibility](https://support.google.com/youtube/answer/157177), [YouTube upload limits](https://support.google.com/youtube/answer/71673), [YouTube encoding](https://support.google.com/youtube/answer/1722171), [YouTube captions](https://support.google.com/youtube/answer/6373554), [GitHub attachments](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files), [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), [Drive sharing](https://support.google.com/drive/answer/2494822), [Drive video playback](https://support.google.com/drive/answer/2423694), [Gmail personal attachments](https://support.google.com/mail/answer/6584), [Workspace Gmail sending limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace), [Gmail video preview](https://support.google.com/mail/answer/30719), [Gmail images](https://support.google.com/mail/answer/145919), [Loom pricing](https://www.loom.com/pricing), [Loom sharing](https://support.loom.com/hc/en-us/articles/10018089306141-Sharing), [Vimeo privacy](https://help.vimeo.com/hc/en-us/articles/12426199699985-About-video-privacy-settings), [Vimeo free plan](https://help.vimeo.com/hc/en-us/articles/12425432518801-About-the-Vimeo-Free-plan)

Gmail does not provide dependable sender-controlled HTML5 video across mixed clients. Treat previews as optional, and make the text complete when its still image is hidden. [Gmail video preview](https://support.google.com/mail/answer/30719), [Gmail images](https://support.google.com/mail/answer/145919)

## Recording plan for this demo

Record the browser after the local services are ready, and open the Wayfinder generative route directly at `http://127.0.0.1:5173/generative`. The app requires a local Python fare API, Node model agent, signed-in Codex CLI, and Vite frontend, so the current interactive application cannot run as a static GitHub Pages site. The repository documents the services and loopback routes, and states that all schedules and fares are generated examples rather than live or bookable inventory. [Project runtime](../README.md#run-locally), [runtime launcher](../scripts/run.mjs)

A focused walkthrough should take 90 to 150 seconds:

1. Show the welcome screen and choose **Compare price vs time**, which asks for exact London to Paris options and an obvious price-versus-duration tradeoff. [Built-in prompt](../src/generative/chat/thread-shell.tsx)
2. Briefly show the generated comparison. Add one fare and point out that the selection appears in the Planning tracker with route, date, mode, carrier, and price. [Planning tracker](../src/generative/tracker/planning-tracker.tsx)
3. Open the Buy dialog and state that it is a demo confirmation only. Close it, then show Cancel or Clear all. The repository and UI state that no booking is available. [Planning tracker](../src/generative/tracker/planning-tracker.tsx), [synthetic total](../src/generative/catalog/views/index.tsx)
4. End on a still frame that says: "Unofficial personal prototype. Synthetic demo data. No live inventory or booking."

Label any pause cut as an edited walkthrough. Keep the terminal, local paths, account details, history, bookmarks, notifications, keys, email, and developer diagnostics outside the selected capture area.

On macOS, Shift-Command-5 or QuickTime Player is the simplest way to record a selected screen portion with a microphone. For the recommended YouTube route, review and trim the macOS MOV, then upload it directly as Unlisted. Convert only for a native Pages, GitHub, or email MP4, or to reduce size. HandBrake's General presets include Fast 1080p30 and Fast 720p30 with MP4, H.264, and AAC. Do not assume system audio works on this Mac without testing it. OBS documents desktop-audio capture on macOS 13 and later and recoverable formats that can be remuxed to MP4. [Apple screen recording](https://support.apple.com/en-ie/102618), [QuickTime export](https://support.apple.com/en-au/guide/quicktime-player/qtp20e395859/10.5/mac/26), [YouTube supported formats](https://support.google.com/youtube/troubleshooter/2888402?hl=en-gb), [HandBrake quick start](https://handbrake.fr/docs/en/latest/introduction/quick-start.html), [HandBrake preset selection](https://handbrake.fr/docs/en/latest/workflow/select-preset.html), [HandBrake official presets](https://handbrake.fr/docs/en/latest/technical/official-presets.html), [OBS macOS audio](https://obsproject.com/kb/macos-desktop-audio-capture-guide), [OBS recording formats](https://obsproject.com/kb/standard-recording-output-guide), [OBS Hybrid MP4](https://obsproject.com/kb/hybrid-mp4)

Keep one high-quality master. At constant nominal rates, 1080p H.264 at 4 Mbps plus 160 kbps AAC produces about 47 to 78 MB for 90 to 150 seconds: `(4 + 0.16) Mbps × seconds ÷ 8`. An optional 90-second 720p copy at 1.5 Mbps plus 128 kbps AAC is about 18 MB; target no more than 20 MB because recipient limits may be lower. These are indicative bitrate calculations, not quality guarantees or predicted HandBrake preset sizes. Compress a copy, not the master. YouTube recommends MP4, H.264, and AAC when conversion is needed. [YouTube encoding](https://support.google.com/youtube/answer/1722171)

## Project publication status

The project records the Omio name, logo styling, and supplied assets as property of their respective owners, used as visual reference material for a non-production demo with synthetic fare data. The video and email should repeat that boundary rather than present the prototype as an official Omio product. [Asset provenance](../public/assets/omio/SOURCES.md)

The [existing GitHub repository](https://github.com/ArdaOzd/omio-gen-ui-demo) is public, but its default `main` page and remote `dev` branch do not represent the current local `dev` checkout. A 2026-10-09 check with `git status --short --branch` and `git rev-list --left-right --count origin/dev...HEAD` found the local branch four commits ahead of `origin/dev`. Link an exact source revision only after the intended version has been reviewed and explicitly pushed. No push, Pages publication, video upload, or message send is part of this research.

A future Pages site should host the recording and project explanation. The functional app would need deployable replacements for its local backend, model agent, and data. Offer the exact source link after it matches the recorded build.

## Gmail draft

Subject: Personal prototype: generative travel UI

> Hi [Name],
>
> I built an unofficial personal prototype exploring how a travel planner can generate an interface around a travel request while keeping the fare interactions local. It uses synthetic demo data and does not connect to live inventory or booking.
>
> [Still image with alt text: Generative travel UI comparing price and journey time]
>
> Watch the 90-second demo: [full visible `https://www.youtube.com/watch?v=...` URL]
>
> Opens in your browser; no account required.
>
> Best,
>
> Arda

The sentence about account-free playback should remain only after the final unlisted watch URL has been tested while logged out. The message must still make sense if Gmail hides the still image. Do not add tracking pixels, open trackers, shortened links, or tracking query parameters. Drafting this text does not authorize upload, publication, or sending.
