KissAnime/Cartoon Downloader
=============

This userscript is used as an extension to streaming sites that allow for the user to download episodes and/or movies more conveniently. The script is available here and also at [Greasyfork](https://greasyfork.org/en/scripts/10305-kissanime-cartoon-downloader).

Supported Sites
--------
- [KissAnime.com](http://kissanime.com/) 
- [KissCartoon.me](http://kisscartoon.me/) 
- [KissAsian.com](http://kissasian.com/)


Installation & Usage
------------
1. Install a userscript manager for your specified browser, such as [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) and [Greasemonkey for Firefox](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
2. Install the script from [this site](https://greasyfork.org/en/scripts/10305-kissanime-cartoon-downloader), using the green install button
3. Visit either a series page containing the episode list, or an episode/movie page
4. Use the download bar to select how many episodes to download, and press the download button

Functionality
--------
This script  grants the user the ability to download files from the sites from the [supported sites](#Supported%20Sites). From there, the user can download episodes from either the series list, or the episode viewing page, as shown in the following screenshots:
#### Episode View Page
There are a few added elements on this page, as indicated by the top bar. Most of the elements are self explanatory, however:
+ The "Remove Dub/Sub" checkbox removes the (sub) or (dub) from the name of the file when saving.
+ The dropdown next to the download button (current value is one), reflects the amount of episodes to download, **inclusive** of the episode that is currently being viewed.

![Episode page](https://github.com/Domination9987/KissAnime-Cartoon-Downloader/blob/master/screenshots/episodePage.jpg?raw=true "Episode view page")
### Series Page
The interface on the series page is similar to that of the episode page in the "Remove Dub/Sub" checkbox and the download bar. The functionality of this page includes:
+ The "Download Selected" button downloads the episodes that are currently checked (as you'd expect). If no episodes are checked, this button will be disabled.
+ The second dropdown box, with current value one, is the amount of episodes to be downloaded **after and including** the episode selected in the first dropdown. This means that values 1 and 1 respectively would download the first episode only, and values 5 and 4 respectively would download episodes 5, 6, 7, 8.

![Series page](https://github.com/Domination9987/KissAnime-Cartoon-Downloader/blob/master/screenshots/seriesPage.jpg?raw=true "Series page")


Credits
=======

Thanks to Mauz Khan for his [excellent blog](http://muaz-khan.blogspot.com.au/2012/10/save-files-on-disk-using-javascript-or.html) on how to save files to disk using javascript 