// ==UserScript==
// @name         KissAnime/Cartoon Downloader
// @namespace    https://greasyfork.org/users/10036
// @version      0.33
// @description  Download videos from the sites KissAnime.com, KissAsian.com and KissCartoon.com
// @author       D. Slee
// @icon         http://kissanime.com/Content/images/favicon.ico
// @match        http://kissanime.com/Anime/*
// @match        http://kissanime.to/Anime/*
// @match        http://kissasian.com/Drama/*
// @match        http://kisscartoon.me/Cartoon/*
// @match        https://*.googlevideo.com/*
// @match        https://*.c.docs.google.com/*
// @license      Creative Commons; http://creativecommons.org/licenses/by/4.0/
// @require      http://code.jquery.com/jquery-1.11.0.min.js
// @grant        none
// ==/UserScript==

/* INFO
This script contains three parts
 1. The download bar handler
 2. The series page handler
 3. The downloading video handler << This is the google docs sites
*/

//Misc functions
String.prototype.contains = function(search){
    var str = this;
    if (Object.prototype.toString.call(search) === '[object Array]'){
        for (i = 0; i<search.length; i++){
            if (str.split(search[i]).length > 1) return true;
        }
    } else if (typeof search === 'string'){
        if (str.split(search).length > 1) return true;
    }
    return false;
};

String.prototype.singleSpace = function(){
    var array = this.split(" ");
    for (var i = 0; i<array.length; i++){
        if (array[i] === ""){
            array.splice(i, 1);
            i--;
        }
    }
    return array.join(" ");
};

Storage.prototype.setObject = function(key, value){ //Set JSON localstorage
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function(key){ //Retrieve JSON localstorage
    var value = this.getItem(key);
    return value && JSON.parse(value);
};
//Global
var keys = []; //Active keys
var isDown = false; //A flag that represents if the mouse is down or not
var currentWindow = null; //The current window that is active
var remain = 0;  //How many downloads remain...
var eps = [];  //An array of the episode data
var indexes = []; //An array containing the indexes of the episodes to be downloaded
var bar;
var global_settings = localStorage.getObject('global_settings') || {};
var default_setings = {
    'quality':720, //Quality selected
    'remSubDub':false, //Whether or not to remove (Sub) and (Dub) tags
    'downloadTo':'browser', //Whether or not to use jDownload
    'count':true,
    'select':'shift',
    'maxQuality':false,
    'fade':false
};

for (var key in default_setings){
    if (default_setings.hasOwnProperty(key)){
        if (global_settings[key] === undefined){
            global_settings[key] = default_setings[key];
        }
    }
}
UpdateGlobalSettings();

var jDownloadUrls = [];
function UpdateGlobalSettings(){
    localStorage.setObject('global_settings', global_settings);
}

var css = [
    ".disabled{ cursor:default!important; color:black!important;}",
    ".coolfont{ background-color:#393939;border:1px solid #666666;color:#ccc;font:normal 15px 'Tahoma', Arial, Helvetica, sans-serif;}",
    ".coolbutton{ margin-left:0.5em;display:inline-block;cursor:pointer;}",
    ".pointer{ cursor:pointer}",
    ".coollink{ color:red; margin-left:0.8em}",
    ".unselectable{ -webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;}",
    ".midalign{ vertical-align:middle;}",
    ".settingsWindow{ width:100%;height:200px;overflow-y:scroll;border:1px solid gray;border-width:1px 0;}",
    ".settingsWindow a{ color:red}",
    ".settingsWindow h2{ margin-bottom:0.2em}"
];
MakeCss(css);

function MakeCss(cssArray){
    $("<style type='text/css'>"+cssArray.join("\n")+"</style>").appendTo("head");
}

//------------------------------------------------------------------          PART I               -------------------------------------------------------------------------------------*/
if (window.location.href.contains(["Episode", "Movie"]) && $("#selectEpisode").length > 0){
    currentWindow = "episode";

    //Fix styling
    $("#selectPlayer option").each(function(){
        $(this).html($(this).html().replace("(lightweight, mobile supported)", "").replace("(can preload entire video)", ""));
    });
    $('#switch').parent().children().css('width', 'auto');
    $('#switch').html($('#switch').html().replace("Turn off the light", "Off"));

    MakeBar('episode');
    
    //Code here for local download links!!!
    $("#divDownload").html("Download video: ");
    var first = true;
    $("#selectQuality option").each(function(){
        (first) ? first = false : $("#divDownload").html($("#divDownload").html() + " - ");
        var cQuality = parseInt($(this).text().replace("p", "")); //note the use of a local variable
        $("#divDownload").append($("<a>", {html:cQuality+"p", class:"downloadLink pointer"}));
    });

    $(document).on("click", ".downloadLink", function(){
        DownloadCurrent($(this).text().replace("p", ""));
    });

    //------------------------------------------------------------------          PART II              -------------------------------------------------------------------------------------*/
} else if ($(".listing").length > 0){ 
    currentWindow = "series";
    $.getScript("/scripts/asp.js", function(){ //This script is required for some functionality (the asp functions, asp.wrap)
        MakeBar("series");

        $("#multSelect").change(function(){ //A handler for the changing of the first episode to download
            var amount = parseInt($("#multSelect option").length) - parseInt($("#multSelect").val(), 10);
            if ($("#multAmount option").length > amount){
                if ($("#multAmount").val() > amount) $("#multAmount").val(amount);
                $("#multAmount option:gt("+amount+")").remove(); //removes excess
            }
            var count = $("#multAmount option").length;
            for (var i = count; i<=amount; i++){
                $("#multAmount").append($("<option>", {value:i+1, html:i+1}));
            }
        });
    });

    //------------------------------------------------------------------          PART III             -------------------------------------------------------------------------------------*/
} else if (window.location.href.indexOf("google") > -1){ //called by GetVid as a result of an iframe
    var link = window.location.href;
    if (link.split('#').length > 1){
        var settings = JSON.parse(link.split("#")[1].replace(/\%22/g,'"').replace(/%0D/g, "")); //settings is an object including title, remain, link, host, downloadTo
        $('body').remove(); //Stop video
        SaveToDisk(link, settings); //Save
    }
}

function SaveToDisk(link, settings){
    var save = document.createElement('a');
    save.href = link.split("#")[0]+"&title="+settings.title;
    save.target = '_blank';
    save.download = settings.title || 'unknown';
    if (settings.downloadTo === "browser"){ //Will attempt to download through browser
        (document.body || document.documentElement).appendChild(save);
        save.onclick = function() {
            (document.body || document.documentElement).removeChild(save);
        };
        var mouseEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        save.dispatchEvent(mouseEvent);
    } else if (settings.downloadTo === "idm"){ //Will attempt to downoad through idm
        window.location.href = save.href;
    }

    var returnObj = {'iframeId':settings.iframeId, 'buttonId':settings.buttonId};
    if (settings.downloadTo === 'jDownload') returnObj.url = save.href;
    setTimeout(function(){window.parent.postMessage(returnObj, settings.host);}, 500); //Iframe parent message    
}

//------------------------------------------------------------------         CONSTRUCTION          -------------------------------------------------------------------------------------*/
function MakeBar(page){
    if (page === 'episode'){
        bar = $('#selectPlayer').parent().parent(); //The bar that contains quality + download buttons
        MakeMultiple("multAmount", "Select the amount of episodes after and including the starting episode");
        MakeButton({first:true, buttonId:"dlButton", text:"Download", handler:"main"});
        MakeQuality();
        MakeSettings();
    } else if (page === 'series'){
        $(".listing").before($("<div>", {id:'bar'}));
        bar = $("#bar");
        MakeMultiple("multSelect", "Select the episode you would like to start downloading from");
        MakeMultiple("multAmount", "Select the amount of episodes after and including the starting episode");
        MakeQuality();
        MakeButton({buttonId:"dlButton", text:"Download", handler:"main"});
        MakeButton({buttonId:"dlButton_sel", text:"Download Selected", handler:"select", disabled:true});
        MakeSettings();
        MakeCheckboxes();
    }
}

function MakeQuality(){ //Makes the quality switch
    if ($('#selectQuality').length > 0){
        $("#selectQuality").parent().css("display", "inline-block");
    } else {
        if (typeof setCookie == 'function') setCookie("usingFlashV1", false); //Fixes JWPlayer bug
        bar.prepend($("<select>", {
            id: "selectQuality"
        }));
        $.get(eps[0], function(xhr){
            var $div = $("<div>").html(xhr.split("selector")[1].split("</div>")[0]);
            $div.find('option').each(function(){
                $("#selectQuality").append($("<option>", {html:$(this).text()}));
            });
        });
    }
}

function MakeButton(params){ //Makes the download button, params include buttonId, text, handler, first, disabled
    button = $("<input>", {
        id:params.buttonId,
        type:"button",
        value:params.text,
        defaultValue:params.text,
        class:"coolfont coolbutton"
    });
    if (!params.objectOnly) bar.append(button);
    if (params.css) button.css(params.css);
    if (params.disabled) ButtonState(params.buttonId, false);

    if (params.handler) button.click(function(){MainDl($(this), params, indexes)});
    if (!params.handler) return button;
    
    function MainDl($this, params, indexes){
        if ($this.hasClass("disabled") === false){
            jDownloadUrls = [];
            if ($("#jDownload")) $("#jDownload").remove();
            ButtonState(params.buttonId, false);
            
            global_settings.quality = parseInt($("#selectQuality option:selected").text().replace("p",""));
            UpdateGlobalSettings();

            if (params.handler === 'main'){ //If it is the button from the main bar
                var indexes = []; //Remains separate for now...
                var startIndex = 0;
                var count = parseInt($("#multAmount").val(), 10);
                if ($("#multSelect").length > 0){ //if it is from the series page
                    startIndex = parseInt($("#multSelect").val(), 10) - 1;   
                }
                for (i = startIndex; i<startIndex+count; i++) indexes.push(i);
                remain = indexes.length;
                if (global_settings.count) $("#"+params.buttonId).attr("value", remain+" remaining");

                //If the information for the first download is on the page....
                if (params.first){
                    indexes.shift(); //Removes first item from array
                    DownloadCurrent(global_settings.quality, params.buttonId); //This also decrements remain when found...
                }
            } else if (params.handler === 'select'){ //If it is the select button
                remain = indexes.length;
                if (global_settings.count) $("#"+params.buttonId).attr("value", remain+" remaining");
            }

            //Confirmation box
            if (indexes.length > 0){
                window.onbeforeunload = function() {
                    return "Leaving this page will cancel some of your downloads!";
                };
                DownloadVideos(indexes, params.buttonId); //Download the videos with the given indexes
            }
            
        }
    }
}

function MakeMultiple(id, info){ //Makes the multiple dropdown boxes
    multiple = $("<select>", {
        id:id,
        class:"coolfont",
        title:info
    });

    var i = 1;
    $("#selectEpisode option:selected").nextAll().andSelf().each(function(){
        eps.push($(this).val());
        i += 1;
    });
    $(".listing a").each(function(){
        eps.unshift($(this).attr("href"));
        i += 1;
    });
    for (var j = 1; j<i; j++){
        option = $("<option>", {
            value: j,
            text: j
        });
        multiple.append(option);
    }
    bar.append(multiple);
}

function MakeSettings(){
    var $container = $("<div>", {class:"settingsWindow"}).append("<p>Below are some settings that can be used to configure the script. The settings for the script update as soon as a value is changed automatically, and this change carries across browser windows without the need to restart. Further help can be found at <a href='https://greasyfork.org/en/scripts/10305-kissanime-cartoon-downloader'>Greasyfork</a> or <a href='https://github.com/Domination9987/KissAnime-Cartoon-Downloader'>GitHub</a>.</p>");
    var checkboxes = [];
    var radios = [];

    $container.append("<h2>Filename parameters</h2>");
    $container = MakeCheck('remSubDub', 'Use this checkbox to rename the files with or without the (dub) and (sub) tags', 'Remove Dub/Sub tags', {'appendTo':$container});
    checkboxes.push("remSubDub");

    $container.append("<h2>Downloading parameters</h2>");
    $container = MakeCheck('count', 'Use this checkbox to toggle the counting down functionality', 'Enable Countdown', {'appendTo':$container});
    checkboxes.push("count");
    $container = MakeCheck('maxQuality', 'Use this checkbox to force the maximum quality to be downloaded', 'Force Max Quality', {'appendTo':$container, 'help':'This option <b>overrides</b> the manual quality setting'});
    checkboxes.push("maxQuality");

    $container = MakeRadio('downloadTo', 'Select the method by which you want to download:', {
        browser:{text:'Download with Browser', info:'Use the browser to download your files'}, 
        idm:{text:'Download with IDM', info:'Use Internet Download Manager to download your files', help:'This requires the <a href="http://getidmcc.com/">Firefox</a> or the <a href="http://www.internetdownloadmanager.com/register/new_faq/chrome_extension.html">Chrome</a> IDM plugins to be installed.'}, 
        jDownload:{text:'Download with JDownloader', info:'Acquire a group of links to paste into JDownloader 2', help:'This can be done by creating a collection of links, which can then be copied and pasted to JDownloader\'s link grabber.'}}, {appendTo:$container});
    radios.push('downloadTo');

    $container.append("<h2>Select settings</h2>");
    $container = MakeRadio('select', 'Choose your selection method:', {
        drag:{text:'Drag Select', info:'Toggle the selection of episodes by dragging over them', help:'This does not work when the mouse is moving quickly'}, 
        shift:{text:'Shift Select', info:'Use shift key to assist in selecting episodes', help:'Allows the use of shift key to select the range of videos from the selection screen'}}, {appendTo:$container});
    radios.push('select');

    $container.append("<h2>Miscellaneous</h2>");
    $container = MakeCheck('fade', 'Toggle the fading animations of the lightboxes', 'Enable Fading Animation', {'appendTo':$container});
    checkboxes.push("fade");
    
    var light = new Lightbox('Settings', $container);
    var settingsBtn = MakeButton({text:"Settings"});
    settingsBtn.click(function(){
        $(".helpToggle").hide();
        global_settings = localStorage.getObject('global_settings');
        for (i = 0; i<checkboxes.length; i++) $("#"+checkboxes[i]).prop("checked", global_settings[checkboxes[i]]);
        for (i = 0; i<radios.length; i++) $("#"+radios[i]).find("input[value='"+global_settings[radios[i]]+"']").attr("checked", "checked");
        light.enable();
    });
}

function CheckHelp($element, object){
    var object = object || {};
    if (object.help){
        var $div = $("<div>", {style:"background-color:'green';display:none;width:300px", html:object.help, class:'helpToggle'});
        var $a = $("<a>", {
            html: "help?",
            class: "pointer coollink"
        }).click(function(){
            $(this).next().find("div").slideToggle();
            ($(this).html() === "help?") ? $(this).html("close") : $(this).html("help?");
        });
        $element.append($a).append($("<div>", {style:'display:inline-block'}).append($div));
    }
    return $element;
}

function MakeCheck(setting, info, label, options){ //Makes the boolean checkboxes
    var options = options || {};
    var $check = $("<label>", {title:info}).append($("<input>", {
        id:setting,
        type:'checkbox',
        class:'unselectable midalign'
    }));
    $check.html($check.html() + " "+label);

    $check.find("input").change(function(){
        global_settings[setting] = $(this).is(':checked');
        UpdateGlobalSettings();
    });

    $div = $("<div>", {style:'padding:0.4em 0'}).append($check);
    $div = CheckHelp($div, options);
    $div.append("<br />");

    if (options.appendTo) return options.appendTo.append($div);
    return $div;
}
function MakeRadio(setting, label, choices, options){ //Makes the boolean checkboxes
    var $radio = $("<form>", {id:setting});
    for (var key in choices){
        if (choices.hasOwnProperty(key)){
            var choice = choices[key];
            var info = choice.info || '';
            $button = $("<label>", {title:info}).append($("<input>", {
                type:'radio',
                name:setting,
                value:key
            }));

            $radio.append($button);
            $button.html($button.html()+" "+choice.text);
            $radio = CheckHelp($radio, choice);
            $radio.append("<br />");
        }
    }
    $(document).on("change", "input[name="+setting+"]:radio", function(){
        global_settings[setting] = $(this).attr("value");
        UpdateGlobalSettings();
    });

    $div = $("<div>", {html:label, style:'padding:0.4em 0'}).append($radio);
    if (options.appendTo) return options.appendTo.append($div);
    return $div;
}

$(document).mousedown(function(e){
    if (e.which === 1) isDown = true;
}).mouseup(function(e){
    if (e.which === 1) isDown = false;
}).keydown(function(e){
    keys[e.keyCode] = true;
}).keyup(function(e){
    keys[e.keyCode] = false;
});

function MakeCheckboxes(){
    MakeCss([" .hovered{ background:#660000!important;color:yellow}"]);

    function MouseHandle(e, $this){
        if ((isDown && global_settings.select === 'drag') || e.data.force){
            if (keys[16] === true && global_settings.select === 'shift'){
                var last = window.last_index;
                var index = UpdateState($this);
                if (last === undefined) return;
                var range = [last, index].sort(sortNumber);
                
                for (var i = Number(range[0])+1; i<Number(range[1]); i++){
                    UpdateState($("input[index="+i+"]").parent().parent());
                }
            } else {
                UpdateState($this);
            }
        window.last_index = $this.find("input").attr("index");
        }
    }

    function UpdateState($this){
        var index = $this.find("input").attr("index");
        var newState = !$this.find("input").prop("checked");
        $this.find("input").prop("checked", newState);
        if (newState){ //if activated
            if (indexes.indexOf(index) === -1){
                indexes.push(index);
                $this.find("td").addClass("hovered");
            }
            if (!ButtonState("dlButton_sel")) ButtonState("dlButton_sel", true);
        } else {
            indexes.splice(indexes.indexOf(index), 1);
            $this.find("td").removeClass("hovered");
            if (indexes.length === 0) ButtonState("dlButton_sel", false);
        }
        return index;
    }

    var length = $("table.listing tr:gt(1)").length;
    $("table.listing tr:gt(1)").each(function(){
        $(this).addClass("unselectable");
        $(this).mouseover({force:false}, function(e){MouseHandle(e, $(this))});
        $(this).mousedown({force:true}, function(e){if (e.which === 1) MouseHandle(e, $(this))});

        var $text = $(this).find("td").eq(0);
        var index = length - ($(this).index()-1);
        $text.html("<input type='checkbox' class='checkbox midalign' index='"+index+"'>"+$text.html());
    });
    $(".checkbox").click(function(e){
        e.preventDefault();
    });
}

//------------------------------------------------------------------            MISC               -------------------------------------------------------------------------------------*/
//Core downloading functions
function DownloadCurrent(quality, buttonId){
    if (!buttonId){
        var url = asp.wrap($("#selectQuality option:contains('"+quality.toString()+"')").attr("value"));
        var titleText = $("title").text();
        GetExtVid(url, titleText, buttonId);
    } else {
        GetFromPage(document.documentElement.innerHTML, buttonId, '0');
    }
    
}

function DownloadVideos(indexes, buttonId){ //Where indexes refer to the indexes of the videos
    indexes.sort(sortNumber);
    for (var i = 0; i<indexes.length; i++){ //Download the videos
        CreateAnother(indexes[i], buttonId, buttonId+"_"+indexes[i]);
    }
}

function sortNumber(a,b) {
    return Number(a) - Number(b);
}

function CreateAnother(index, buttonId, iframeId){
    var newUrl = eps[index];
    var interval = {'lastRemain':remain, 'exec':0, 'newUrl':newUrl, 'buttonId':buttonId, 'iframeId':iframeId};
    interval.getCheck = function(){ //ClearInterval is done externally
        if (remain !== this.lastRemain){
            this.lastRemain = remain;
            return;
        }
        this.req.abort();
        this.req = $.get(this.newUrl, function(xhr){GetFromPage(xhr, this.buttonId, this.iframeId, this)});
        this.exec += 1;
        if (this.exec > 1) Error("(getCheck): Something is going on with: "+this.iframeId+". Check this URL:"+this.newUrl);
    };

    interval.interval = setInterval(function(){interval.getCheck()}, 5000);
    interval.req = $.get(newUrl, function(xhr){GetFromPage(xhr, buttonId, iframeId, interval)});
}

function GetFromPage(xhr, buttonId, iframeId, interval){
    var $div = $("<div>").html(xhr.split("selector")[1].split("</div>")[0]);
    var text = $div.find('option:contains("'+global_settings.quality.toString()+'")').attr("value");
    if (text === undefined || global_settings.maxQuality){
        text = $div.find('option').eq(0).attr("value");
        if (text === undefined) return;
    }
    var url = asp.wrap(text);
    var titleText = xhr.split("<title>")[1].split("</title>")[0];
        
    if (interval) clearInterval(interval.interval);
    GetExtVid(url, titleText, buttonId, iframeId);
}

function GetExtVid(url, titleText, buttonId, iframeId){ //Get the link for a new video
    var title = (titleText.split("- Watch")[0].replace(/\n/g, " ")).trim().singleSpace();
    GetVid(url, title, buttonId, iframeId);
}

function GetVid(link, title, buttonId, iframeId){ //Force the download to be started from an iframe
    if (global_settings.remSubDub === "true"){
        title = title.replace(" (Dub)", "").replace(" (Sub)", "");
    }
    var settings = {"title":encodeURIComponent(title), "host":window.location.href.split(".com")[0]+".com", "downloadTo":global_settings.downloadTo, "buttonId":buttonId, "iframeId":iframeId};
    var $iframe = $("<iframe>", { //Send video to other script to be downloaded.
        src: link + "#" + JSON.stringify(settings),
        style: "width:0;height:0",
        id: 'dlExt'+iframeId,
        class: 'extVid'
    });
    $("body").append($iframe);

    var interval = {exec:0, id:iframeId, title:title, url:$iframe.attr("src")};
    interval.iframeCheck = function(){ //this.id should refer to the id of the iframe (iframeId) 
        ($("#dlExt"+this.id).length > 0) ? $('#dlExt'+this.id).attr("src", $('#dlExt'+this.id).attr("src")) : clearInterval(this.interval);
        this.exec += 1;
        if (this.exec > 1) Error("(iframeCheck): Something is going on with: "+this.title+" at the URL:"+this.url);
    };
    interval.interval = setInterval(function(){interval.iframeCheck()}, 5000);
}

function ButtonState(id, enable){
    if (enable !== 'undefined'){    
        if (enable){
            $("#"+id).removeClass("disabled");
            $("#"+id).removeAttr("disabled");
        } else if (enable === false) {
            $("#"+id).addClass("disabled"); 
            $("#"+id).attr("disabled", ""); //This removes the blue highlighting
        }
    } else if (id){
        return !($("#"+id).hasClass("disabled"));
    }
}

// IFrame cross-browser stuff, removes the iframe when it has loaded...
$(document).ready(function(){
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    // Listen to message from child IFrame window
    eventer(messageEvent, function (e){
        if (e.origin){
            if (e.origin.split('docs.google').length > 1 || e.origin.split("googlevideo").length > 1){
                $("#dlExt"+e.data.iframeId).remove();
                if (global_settings.downloadTo === 'jDownload') jDownloadUrls.push(e.data.url);

                remain--;
                if (global_settings.count) $("#"+e.data.buttonId).attr("value", remain+" remaining");
                if (remain === 0){
                    $("#"+e.data.buttonId).attr("value", $("#"+e.data.buttonId).attr("defaultValue"));
                    if (global_settings.downloadTo === 'jDownload') ProcessJDownload();
                    window.onbeforeunload = null; //Remove leave confirmation
                    setTimeout(function(){ButtonState(e.data.buttonId, true)}, 500); //Reset the button
                } 
            }
            
        }
    }, false); 
});

function ProcessJDownload(){
    jDownloadUrls.sort(SortJDownload);
    var $div = $("<textarea>", {id:"jDownload",text:jDownloadUrls.join("\n"),style:"display:block;margin:1em auto;white-space:nowrap;overflow:auto;width:90%;padding:1em;height:5em"});
    if (currentWindow === 'episode') $("#centerDivVideo").after($div);
    if (currentWindow === 'series') $("table.listing").before($div);
    $div.select();
}

function SortJDownload(a, b){
    return Number(a.split("Episode%20")[0].substr(0,3)) - Number(b.split("Episode%20")[0].substr(0,3));
}

//Misc functions
function Lightbox(id, $container, params){
    var params = params || {};
    this.enable = function(){
        (global_settings.fade) ? $("#"+id+"_box").stop().fadeIn() : $("#"+id+"_box").show();
        (global_settings.fade) ? $("#"+id+"_content").stop().fadeIn() : $("#"+id+"_content").show();
    };
    this.disable = function(){
        (global_settings.fade) ? $("#"+id+"_box").stop().fadeOut() : $("#"+id+"_box").hide();
        (global_settings.fade) ? $("#"+id+"_content").stop().fadeOut() : $("#"+id+"_content").hide()
    };

    var $content = $("<div>").append("<h1 class='coolfont' style='padding:0.5em;text-align:center'>"+id+"</h1>");
    $content.append($container);
    LockScroll($container);
    var closeBtn = new MakeButton({text:"Close", objectOnly:true, css:{'margin':'auto','margin-top':'8px','display':'block'}});
    $content.append($("<div>", {'style':'height:100%;position:relative'}).append(closeBtn));
    closeBtn.click(this.disable);
    
    var $box = $("<div>", {
        style:"display:none;width:100%;height:150%;top:-25%;position:fixed;background-color:black;opacity:0.8;z-index:99",
        id:id+'_box'
    }).click(this.disable);
    
    $content.css("margin", "0.5em 1em").addClass("unselectable");
    var $wrap = $("<div>", {
        id:id+"_content",
        style:"color:black;display:none;background-color:white;position:fixed;width:400px;height:300px;margin:auto;left:0;right:0;top:30%;border:1px solid #999999;z-index:100"
    }).append($content)
    
    if (params.wrapCss) $wrap.css(params.wrapCss);
    if (params.contCss) $content.css(params.contCss);
    if (params.selectable) $content.removeClass("unselectable");
    $("body").append($box).append($wrap);
}

function Error(text){
    var $container = $("<div>", {class:"settingsWindow"}).append("<p>You have encountered an error. Please send details of this error to the developer at <a href='https://greasyfork.org/en/scripts/10305-kissanime-cartoon-downloader/feedback'>Greasyfork</a> or <a href='https://github.com/Domination9987/KissAnime-Cartoon-Downloader/issues'>GitHub</a>.</p>");
    $container.append($("<p>", {html:text}));
    var light = new Lightbox("Error", $container, {'selectable':true});
    light.enable();
}

function LockScroll($element){
    $element.bind("mousewheel DOMMouseScroll", function(e){
        var up = (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0);
        if ((Math.abs(this.scrollTop - (this.scrollHeight - $(this).height())) < 3 && !up) || (this.scrollTop === 0 && up)){
            e.preventDefault();
        }
    });
}