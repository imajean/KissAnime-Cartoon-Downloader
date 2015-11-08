// ==UserScript==
// @name         KissAnime/Cartoon Downloader
// @namespace    https://greasyfork.org/users/10036
// @version      0.36
// @description  Download videos from the sites KissAnime.com, KissAsian.com and KissCartoon.com
// @author       D. Slee
// @icon         http://kissanime.to/Content/images/favicon.ico
// @match        http://kissanime.com/Anime/*
// @match        http://kissanime.to/Anime/*
// @match        http://kissasian.com/Drama/*
// @match        http://kisscartoon.me/Cartoon/*
// @match        https://*.googlevideo.com/*
// @match        https://*.c.docs.google.com/*
// @match        http://kissanime.to/Special/AreYouHuman*
// @match        http://kissanime.com/Special/AreYouHuman*
// @license      Creative Commons; http://creativecommons.org/licenses/by/4.0/
// @require      http://code.jquery.com/jquery-1.11.0.min.js
// @grant        none
// ==/UserScript==

/* INFO
This script contains four parts
 1. The download bar handler
 2. The series page handler
 3. Handles iframe captcha
 4. The downloading video handler << This is the google docs sites
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
var errors = 0;
var keys = []; //Active keys
var isDown = false; //A flag that represents if the mouse is down or not
var currentWindow = null; //The current window that is active
var remain = {};  //How many downloads remain...
var eps = [];  //An array of the episode data
var indexes = []; //An array containing the indexes of the episodes to be downloaded
var processes = []; //An array containing all the processes being run
var bar;
var global_settings = localStorage.getObject('global_settings') || {};
var default_setings = {
    'quality':720, //Quality selected
    'remSubDub':false, //Whether or not to remove (Sub) and (Dub) tags
    'downloadTo':'browser', //Whether or not to use jDownload
    'count':true,
    'select':'shift',
    'maxQuality':false,
    'fade':false,
    'errTimeout':5,
    'waitTime':0,
    'debug':true
};
SetupGlobalSettings(); //Ensures that all global_settings are set... if not, refer to default_settings

var jDownloadUrls = [];
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
    ".settingsWindow h2{ margin-bottom:0.2em}",
    ".inputdiv { padding:0.4em 0}"
];
MakeCss(css);

linkSplit = window.location.href.split('.');
var $captcha = $("<iframe>", {style:"border:0;width:100%;overflow:hidden;height:500px", seamless:true, src:linkSplit[0]+"."+linkSplit[1].split("/")[0]+'/Special/AreYouHuman?reUrl=hi', class:'captcha'});


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
} else if (window.location.href.indexOf("Special") > -1){
	$("body").html($("#formVerify"));

//------------------------------------------------------------------          PART IV              -------------------------------------------------------------------------------------*/
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
    $("#selectEpisode option:selected").nextAll().andSelf().each(function(){ eps.push($(this).val());});
    $(".listing a").each(function(){ eps.unshift($(this).attr("href"));});
    if (page === 'episode'){
        bar = $('#selectPlayer').parent().parent(); //The bar that contains quality + download buttons
        MakeMultiple("multAmount", {appendTo:bar, info:"Select the amount of episodes after and including the starting episode", numeric:true, range:[1,eps.length+1]});
        MakeButton({first:true, id:"dlButton", text:"Download", handler:"main"});
        MakeQuality();
        MakeSettings();
    } else if (page === 'series'){
        $(".listing").before($("<div>", {id:'bar'}));
        bar = $("#bar");
        MakeMultiple("multSelect", {appendTo:bar, info:"Select the episode you would like to start downloading from", numeric:true, range:[1,eps.length+1]});
        MakeMultiple("multAmount", {appendTo:bar, info:"Select the amount of episodes after and including the starting episode", numeric:true, range:[1,eps.length+1]});
        MakeQuality();
        MakeButton({id:"dlButton", text:"Download", handler:"main"});
        MakeButton({id:"dlButton_sel", text:"Download Selected", handler:"select", disabled:true});
        MakeSettings();
        MakeCheckboxes();
    }
}

function MakeQuality(){ //Makes the quality switch
    if ($('#selectQuality').length > 0){
        $("#selectQuality").parent().css("display", "inline-block");
        QualityChange();
    } else {
        if (typeof setCookie == 'function') setCookie("usingFlashV1", false); //Fixes JWPlayer bug
        $.get(eps[0], function(xhr){
            var options = [];
            var text = xhr.split("selector")[1];
            (text) ? text = text.split("</div>")[0] : Error($captcha, MakeQuality);
            if (!text) return;
            var $div = $("<div>").html(text);
            $div.find("option").each(function(){
                options.push({
                    'text':$(this).text(),
                    'value':$(this).text().replace("p","")
                });
            });
            MakeMultiple("selectQuality", {prependTo:bar, options:options});
            QualityChange();
        });
    }
    function QualityChange(){
        $option = $("#selectQuality option:contains("+global_settings.quality.toString()+")");
        if ($option) $option.prop("selected", true);
        $("#selectQuality option:selected").change(function(){
            global_settings.quality = parseInt($("#selectQuality option:selected").text().replace("p",""));
            UpdateGlobalSettings();
        });
    }
}

function MakeButton(params){ //Makes the download button, params include buttonId, text, handler, first, disabled
    button = $("<input>", {
        id:params.id,
        type:"button",
        value:params.text,
        defaultValue:params.text,
        class:"coolfont coolbutton"
    });
    params.buttonId = params.id;
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
            ButtonState("settingsBtn", false);
            
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
                remain[params.buttonId] = indexes.length;
                if (global_settings.count) $("#"+params.buttonId).attr("value", remain[params.buttonId]+" remaining");

                //If the information for the first download is on the page....
                if (params.first){
                    indexes.shift(); //Removes first item from array
                    DownloadCurrent(global_settings.quality, params.buttonId); //This also decrements remain when found...
                }
            } else if (params.handler === 'select'){ //If it is the select button
                remain[params.buttonId] = indexes.length;
                if (global_settings.count) $("#"+params.buttonId).attr("value", remain[params.buttonId]+" remaining");
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

function MakeMultiple(id, params){ //Makes the multiple dropdown boxes
    var params = params || {};
    multiple = $("<select>", {
        id:id,
        class:"coolfont"
    });
    if (params.info) multiple.attr("title", params.info);

    if (params.numeric){
        for (var i = params.range[0]; i<params.range[1]; i++){
            option = $("<option>", {
                value: i,
                text: i
            });
            multiple.append(option);
        }
    } else {
        for (var i = 0; i<params.options.length; i++){
            option = $("<option>", {
                value: params.options[i].value,
                text: params.options[i].text
            });
            multiple.append(option);
        }
    }
    
    if (params.appendTo) return params.appendTo.append(multiple);
    if (params.prependTo) return params.prependTo.prepend(multiple)
    return multiple;
}

function MakeSettings(){
    var $container = $("<div>", {class:"settingsWindow"}).append("<p>Below are some settings that can be used to configure the script. The settings for the script update as soon as a value is changed automatically, and this change carries across browser windows without the need to restart. Further help can be found at <a href='https://greasyfork.org/en/scripts/10305-kissanime-cartoon-downloader'>Greasyfork</a> or <a href='https://github.com/Domination9987/KissAnime-Cartoon-Downloader'>GitHub</a>.</p>");

    $container.append("<h2>Filename parameters</h2>");
    $container = MakeCheck('remSubDub', 'Use this checkbox to rename the files with or without the (dub) and (sub) tags', 'Remove Dub/Sub tags', {'appendTo':$container});

    $container.append("<h2>Downloading parameters</h2>");
    $container = MakeCheck('count', 'Use this checkbox to toggle the counting down functionality', 'Enable Countdown', {'appendTo':$container});
    $container = MakeCheck('maxQuality', 'Use this checkbox to force the maximum quality to be downloaded', 'Force Max Quality', {'appendTo':$container, 'help':'This option <b>overrides</b> the manual quality setting'});

    $container = MakeRadio('downloadTo', 'Select the method by which you want to download:', {
        browser:{text:'Download with Browser', info:'Use the browser to download your files'}, 
        idm:{text:'Download with IDM', info:'Use Internet Download Manager to download your files', help:'This requires the <a href="http://getidmcc.com/">Firefox</a> or the <a href="http://www.internetdownloadmanager.com/register/new_faq/chrome_extension.html">Chrome</a> IDM plugins to be installed.'}, 
        jDownload:{text:'Download with JDownloader', info:'Acquire a group of links to paste into JDownloader 2', help:'This can be done by creating a collection of links, which can then be copied and pasted to JDownloader\'s link grabber.'}}, {appendTo:$container});

    $container.append("<h2>Select settings</h2>");
    $container = MakeRadio('select', 'Choose your selection method:', {
        drag:{text:'Drag Select', info:'Toggle the selection of episodes by dragging over them', help:'This does not work when the mouse is moving quickly'}, 
        shift:{text:'Shift Select', info:'Use shift key to assist in selecting episodes', help:'Allows the use of shift key to select the range of videos from the selection screen'}}, {appendTo:$container});

    $container.append("<h2>Miscellaneous</h2>");
    $container = MakeCheck('fade', 'Toggle the fading animations of the lightboxes', 'Enable Fading Animation', {'appendTo':$container});

    $container.append("<h2>Advanced Settings</h2>");
    $container = MakeCheck('debug', 'Use this checkbox to toggle error checking', 'Enable Error Checking', {'appendTo':$container, 'help':'Disabling this option is <b>NOT</b> recommended <b>AT ALL</b>'});
    $container = MakeRange('errTimeout', {appendTo:$container, label:'Error Timeout:', range:[2, 8], step:0.1, round:1, help:'Use this slider to change the timeout for error checking. If you had an (iframeCheck) error you should increase this value'});
    $container = MakeRange('waitTime', {appendTo:$container, label:'Download Delay:', range:[0, 5], step:0.1, round:1, help:'Use this slider to change the delay period between download requests. Increasing this value increases the chance of downloading videos in order for Browser and IDM integrations, at the compromise of slowing the overall download process'});

    var light = new Lightbox('Settings', $container);
    var settingsBtn = MakeButton({text:"Settings", id:"settingsBtn"});
    settingsBtn.click(function(){
        $(".helpToggle").hide();
        global_settings = localStorage.getObject('global_settings');
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
        class:'unselectable midalign',
        checked:global_settings[setting]
    }));
    $check.html($check.html() + " "+label);

    $check.find("input").change(function(){
        global_settings[setting] = $(this).is(':checked');
        UpdateGlobalSettings();
    });

    $div = $("<div>", {class:'inputdiv'}).append($check);
    $div = CheckHelp($div, options);
    $div.append("<br />");

    if (options.appendTo) return options.appendTo.append($div);
    return $div;
}
function MakeRadio(setting, label, choices, options){ //Makes the boolean checkboxes
    var options = options || {}
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
    $radio.find("input[value='"+global_settings[setting]+"']").attr("checked", "checked");
    $(document).on("change", "input[name="+setting+"]:radio", function(){
        global_settings[setting] = $(this).attr("value");
        UpdateGlobalSettings();
    });

    $div = $("<div>", {html:label, class:"inputdiv"}).append($radio);
    if (options.appendTo) return options.appendTo.append($div);
    return $div;
}

function MakeRange(id, options){ //options include appendTo, label, range, step, round, help
    var options = options || {};
    var $range = $("<input>", {
        id:id,
        type:'range',
        min:options.range[0],
        max:options.range[1],
        step:options.step,
        class:'midalign'
    });
    $range.val(global_settings[id]);
    var $val = $("<output>",{
    	text:Number(global_settings[id]).toFixed(options.round),
        for:id,
        style:"margin-left:0.2em"
    });
    $range.mousemove(function(){
        $("output[for="+id+"]").text(Number($(this).val()).toFixed(options.round));
    }).mouseup(function(){
        global_settings[id] = $(this).val();
        UpdateGlobalSettings();
    });

    $div = $("<div>", {html:options.label, class:"inputdiv"}).append("<br />").append($range).append($val);
    $div = CheckHelp($div, options)

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
                var index = SelectState($this);
                if (last === undefined) return;
                var range = [last, index].sort(sortNumber);
                
                for (var i = Number(range[0])+1; i<Number(range[1]); i++){
                    SelectState($("input[index="+i+"]").parent().parent());
                }
                var $last = $("input[index="+last+"]").parent().parent();
                if (SelectState($last, true) !== SelectState($this, true)) SelectState($last)
            } else {
                SelectState($this);
            }
        window.last_index = $this.find("input").attr("index");
        }
    }

    function SelectState($this, get){
        var index = $this.find("input").attr("index");
        var newState = !$this.find("input").prop("checked");
        if (get) return !newState;
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
    processes.push(new timeout({range:[0, indexes.length], time:global_settings.waitTime, callback:function(i){ //execute a for loop for range, execute every certain amount of seconds
        CreateAnother(indexes[i], buttonId, buttonId+"_"+i);
    }}));
}

function sortNumber(a,b) {
    return Number(a) - Number(b);
}

function CreateAnother(index, buttonId, iframeId){
	Interval.prototype.getCheck = function(){
		if (remain[this.buttonId] !== this.lastRemain){
        	this.lastRemain = remain[this.buttonId];
        	return;
        }
        this.req.abort();
        this.exec += 1;
        if (this.exec > 1 && global_settings.debug){
        	Error("(getCheck): Something went wrong with: "+this.iframeId+". This commonly occurs due to the captcha restraint. Fill in the 'Are you human' test <a href='"+this.newUrl+"'>here</a> and try again."+$captcha[0].outerHTML, Resume);
        } else {
        	var _this = this;
            this.req = $.get(this.newUrl, function(xhr){GetFromPage(xhr, _this.buttonId, _this.iframeId, _this, _this.index)});
        }
	}
	Interval.prototype.makeGetInterval = function(){
		var _this = this;
		this.interval = setInterval(function(){ _this.getCheck()}, global_settings.errTimeout*1000);
		this.req = $.get(newUrl, function(xhr){GetFromPage(xhr, _this.buttonId, _this.iframeId, _this, _this.index)}); 
	}

    var newUrl = eps[index];
    var interval = new Interval({'lastRemain':remain.buttonId, 'newUrl':newUrl, 'buttonId':buttonId, 'iframeId':iframeId, 'index':index, 'make':'makeGetInterval'});
    processes.push(interval);
    interval[interval.make]();
}

function GetFromPage(xhr, buttonId, iframeId, interval, index){
	if (xhr.indexOf("recaptcha") > -1) interval.exec = 5, interval.getCheck();
	if (!xhr.split("selector")[1]) return;
    var $div = $("<div>").html(xhr.split("selector")[1].split("</div>")[0]);
    var text = $div.find('option:contains("'+global_settings.quality.toString()+'")').attr("value");
    if (text === undefined || global_settings.maxQuality){
        text = $div.find('option').eq(0).attr("value");
        if (text === undefined) return;
    }
    indexes.splice(index, 1);
    var url = asp.wrap(text);
    var titleText = xhr.split("<title>")[1].split("</title>")[0];
    if (interval) interval.kill();
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
        id: iframeId,
        class: 'extVid'
    });
    $("body").append($iframe);
    
    Interval.prototype.iframeCheck = function(){ //this.id should refer to the id of the iframe (iframeId)
        ($("#"+this.id).length > 0) ? $('#'+this.id).attr("src", $('#'+this.id).attr("src")) : this.kill();
        this.exec += 1;
        if (this.exec > 1 && global_settings.debug){
        	Error("(iframeCheck): Something went wrong with: \""+this.title+"\". </p><p>It probably isn't redirecting properly. This could be because of slow internet or slow servers. Try increasing the 'Error Timeout' amount in the settings to fix this", Resume);
    	};
    }
    Interval.prototype.makeIframeInterval = function(){
    	var _this = this;
		this.interval = setInterval(function(){ _this.iframeCheck()}, global_settings.errTimeout*1000);
	}

    var interval = new Interval({id:iframeId, title:title, url:$iframe.attr("src"), make:'makeIframeInterval'});
    processes.push(interval);
    interval[interval.make]();
}

function Interval(params){
	this.params = params || {};
	this.exec = 0;
	for (var key in this.params){
		if (this.params.hasOwnProperty(key)){
			this[key] = this.params[key];
		}
	}
}
Interval.prototype.kill = function(){
	clearInterval(this.interval);
    processes.splice(this, 1);
}
Interval.prototype.reset = function(){
	this.exec = 0;
	this[this.make]();
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
    eventer(messageEvent, function(e){
        if (e.origin){
            if (e.origin.split('docs.google').length > 1 || e.origin.split("googlevideo").length > 1){
                $("#"+e.data.iframeId).remove();
                if (global_settings.downloadTo === 'jDownload') jDownloadUrls.push(e.data.url);

                remain[e.data.buttonId]--;
                if (global_settings.count) $("#"+e.data.buttonId).attr("value", remain[e.data.buttonId]+" remaining");
                if (remain[e.data.buttonId] === 0){
                    $("#"+e.data.buttonId).attr("value", $("#"+e.data.buttonId).attr("defaultValue"));
                    if (global_settings.downloadTo === 'jDownload') ProcessJDownload();
                    window.onbeforeunload = null; //Remove leave confirmation
                    setTimeout(function(){ButtonState(e.data.buttonId, true), ButtonState("settingsBtn", true)}, 500); //Reset the button
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
    var count = (params.count) ? "_"+params.count.toString() : "";
    this.enable = function(){
        (global_settings.fade) ? $("#"+id+count+"_box").stop().fadeIn() : $("#"+id+count+"_box").show();
        (global_settings.fade) ? $("#"+id+count+"_content").stop().fadeIn() : $("#"+id+count+"_content").show();
    };
    this.disable = function(){
        (global_settings.fade) ? $("#"+id+count+"_box").stop().fadeOut() : $("#"+id+count+"_box").hide();
        (global_settings.fade) ? $("#"+id+count+"_content").stop().fadeOut() : $("#"+id+count+"_content").hide()
    };

    var $content = $("<div>").append("<h1 class='coolfont' style='padding:0.5em;text-align:center'>"+id+"</h1>");
    $content.append($container);
    LockScroll($container);
    var closeBtn = new MakeButton({text:"Close", objectOnly:true, css:{'margin':'auto','margin-top':'8px','display':'block'}});
    $content.append($("<div>", {'style':'height:100%;position:relative'}).append(closeBtn));
    var _this = this;
    closeBtn.click({_this:_this, params:params}, function(e){
    	e.data._this.disable();
    	if (e.data.params.closeHandler) e.data.params.closeHandler(e.data.params)
   	});
    
    var $box = $("<div>", {
        style:"display:none;width:100%;height:150%;top:-25%;position:fixed;background-color:black;opacity:0.8;z-index:99",
        id:id+count+'_box'
    }).click(this.disable);
    
    $content.css("margin", "0.5em 1em").addClass("unselectable");
    var $wrap = $("<div>", {
        id:id+count+"_content",
        style:"color:black;display:none;background-color:white;position:fixed;width:400px;height:300px;margin:auto;left:0;right:0;top:30%;border:1px solid #999999;z-index:100"
    }).append($content);
    
    if (params.wrapCss) $wrap.css(params.wrapCss);
    if (params.contCss) $content.css(params.contCss);
    if (params.selectable) $content.removeClass("unselectable");
    if ($("#"+id).length === 0) {
    	$("body").append($box).append($wrap);
    } else {
    	$("#"+id).html($("#"+id).html()+$container.html());
    }
}

function Error(text, callback){
	KillProcesses();
    var $container = $("<div>", {class:"settingsWindow"}).append("<p>You have encountered an error. Please send details of this error to the developer at <a href='https://greasyfork.org/en/scripts/10305-kissanime-cartoon-downloader/feedback'>Greasyfork</a> or <a href='https://github.com/Domination9987/KissAnime-Cartoon-Downloader/issues'>GitHub</a>.</p>");
    $container.append($("<p>", {html:text}));
    if ($("#Error").length > 0) $container = $("<p>", {html:text});
    var light = new Lightbox("Error", $container, {'selectable':true, 'count':errors, 'closeHandler':callback});
    light.enable();
}

function LockScroll($element){
    $element.bind("mousewheel DOMMouseScroll", function(e){
        var up = (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0);
        if ((Math.abs(this.scrollTop - (this.scrollHeight - $(this).height())) < 2 && !up) || (this.scrollTop === 0 && up)){
            e.preventDefault();
        }
    });
}

function timeout(params){
	params = params || {};
	for (var key in params){
		if (params.hasOwnProperty(key)){
			this[key] = params[key];
		}
	}
    this.loop = function(){
        this.callback(this.range[0]);
        var _this = this;
        setTimeout(function(){
            _this.range[0]++;
            if (_this.range[0]<_this.range[1]){
                _this.loop();
            }
        }, this.time*1000)
    }
    this.kill = function(){
   		this.range[0] = this.range[1];
   	}
    processes.push(this);
    this.loop();
}
timeout.prototype.reset = function(){
    processes.push(new timeout({range:[0, indexes.length], time:global_settings.waitTime, callback:function(i){ //execute a for loop for range, execute every certain amount of seconds
        CreateAnother(indexes[i], buttonId, buttonId+"_"+i);
    }}));
    processes.splice(processes.indexOf(this), 1);
}

function MakeCss(cssArray){
    $("<style type='text/css'>"+cssArray.join("\n")+"</style>").appendTo("head");
}

$('body').on("DOMNodeInserted", ".captcha", function(e){ //Captcha handling
	if ($(".captcha").length > 1) $(".captcha:gt(0)").remove();
	$(e.target).hide();
	$(e.target).load(function(){
		$(this).show();
	});
});

function SetupGlobalSettings(){
	for (var key in default_setings){
	    if (default_setings.hasOwnProperty(key)){
	        if (global_settings[key] === undefined || global_settings[key] === null){
	            global_settings[key] = default_setings[key];
	        }
	    }
	}
	UpdateGlobalSettings();
}

function UpdateGlobalSettings(){
    localStorage.setObject('global_settings', global_settings);
}

function KillProcesses(){
	for (var i = 0; i<processes.length; i++){
		processes[i].kill();
	}
}