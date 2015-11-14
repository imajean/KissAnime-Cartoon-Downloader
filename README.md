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
This script  grants the user the ability to download files from the sites from the [supported sites](#supported-sites). From there, the user can download episodes from either the series list, or the episode viewing page. The settings menu configures options that remain constant after refresh **on the same domain**. This is due to a limitation in localStorage.

#### Episode View Page
There are a few added elements on this page, as indicated by the top bar. Most of the elements are self explanatory, however the amount of episodes to download is **inclusive**. This means that to download "1" is to download only the current episode, and not the next episode.

![Episode page](https://raw.githubusercontent.com/Domination9987/KissAnime-Cartoon-Downloader/master/screenshots/episodePage.jpg "Episode view page")
![Download links](https://raw.githubusercontent.com/Domination9987/KissAnime-Cartoon-Downloader/master/screenshots/downloadLinks.jpg "Edited download links")

### Series Page
The interface on the series page is similar to that of the episode page in the added download bar. However, in this page, the two dropdown selectors refer to the starting episode and how many to download respectively. This means:
+ A combination of "8" and "5" would download episodes 8,9,10,11,12

It is important to note that the "Download" button handles the two dropdown inputs, whereas the "Download Selected" button handles the checked episodes.

![Series page](https://github.com/Domination9987/KissAnime-Cartoon-Downloader/blob/master/screenshots/seriesPage.jpg?raw=true "Series page")

### Settings

The options of the script can be configured using the settings menu. From this menu, there are the following options:

![Settings](https://raw.githubusercontent.com/Domination9987/KissAnime-Cartoon-Downloader/master/screenshots/settings.jpg "Settings window")

##### Filename parameters
  + The "Remove Dub/Sub" checkbox removes the "(Sub)" or "(Dub)" from the name of the file when saving.

##### Downloading parameters
+ The "Enable Countdown" checkbox provides the user with feedback on how many downloads are queued/remaining from the  current request
+ The "Force Max Quality" checkbox, as it suggests, downloads the highest quality available, regardless of the quality setting
+ The  "Download Options" radio selection can be explained as follows:
  + "Download with Browser" forces the script to download the files through the browser's download interface
  + "Download with IDM" forces the script to download through IDM, by the use of the [Chrome](http://www.internetdownloadmanager.com/register/new_faq/chrome_extension.html) or [Firefox](http://getidmcc.com/) IDM plugins. If it doesn't work it falls back to "Download with Browser"
  + "Download with JDownloader" sends the links directly to JDownloader 2 through the flashgot API. This option currently **has no fallback**, and requires that JDownloader is **open**

##### Select Settings
+ There are two options for selection method, relevant only to the [Series Page](#series-page)
  + "Drag Select" allows for the user to use their mouse and drag over the episodes of the list to select/deselect. This method is **not recommended** as it is unreliable
  + "Shift Select" allows for the user to use shift in conjunction with mouse clicks to select episodes, as you normally would in most file browsers (such as Explorer and Finder)

##### Miscellaneous
+ The "Enable Fading animation" allows for a nice fading animation to be used on the opening or closing of the settings window and/or error messages

##### Advanced Settings
+ The "Enable Error Checking" option is **strongly recommended**, and allows for the user to interact with the program in the case of an error.
+ The "Error Timeout" is a range slider that can be used to change the time before the script gives up on a request. This may need to be increased for slow connections. 
+ The "Download Delay" slider can be used to change the time between each video request. By increasing this value, the speed of adding all videos decreases, but the chance of having ordered downloads is increased. 

Errors
====
It is important to note that upon **closing any Error window** the script will **continually retry**. There are a few errors that can occur for certain reasons. The current known errors are:
+ (iframeCheck): This is an error that indicates that the source of the video is not correctly redirecting. This could be the cause of a broken link supplied by the site host, or it could be the result of slow connection to the server. A fix for this is to increase the "Error Timeout" range slider in settings.
+ (getCheck): This is an error that indicates that the script cannot receive pages from the server. This is an issue as the download links are provided from the episode pages which are obtained through a GET request (which has failed). The solution to this problem (99% of the time) is to fill out the reCAPTCHA provided in the error window.

Acknowledgements
=======

Thanks to Mauz Khan for his [excellent blog](http://muaz-khan.blogspot.com.au/2012/10/save-files-on-disk-using-javascript-or.html) on how to save files to disk using javascript