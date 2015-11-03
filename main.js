// ==UserScript==
// @name         KissAnime/Cartoon Downloader
// @namespace    https://greasyfork.org/users/10036
// @version      0.25
// @description  Download videos from the sites KissAnime.com, KissAsian.com and KissCartoon.com
// @author       D. Slee
// @icon         http://kissanime.com/Content/images/favicon.ico
// @match        http://kissanime.com/Anime/*
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

Storage.prototype.setObject = function(key, value){ //Set JSON localstorage
    this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function(key){ //Retrieve JSON localstorage
    var value = this.getItem(key);
    return value && JSON.parse(value);
}

//Global
var remain = 0;  //How many downloads remain...
var eps = [];  //An array of the episode data
var indexes = []; //An array containing the indexes of the episodes to be downloaded
var isDown = false; //A flag that represents if the mouse is down or not
var bar;
var global_settings = localStorage.getObject('global_settings') || {
    'quality':720, //Quality selected
    'remSubDub':false, //Whether or not to remove (Sub) and (Dub) tags
    'downloadTo':'browser' //Whether or not to use jDownload
}
function UpdateGlobalSettings(){
    localStorage.setObject('global_settings', global_settings);
}

$("<style type='text/css'> .disabled{ cursor:default!important; color:black!important;} </style>").appendTo("head");
$("<style type='text/css'> .coolfont{ background-color:#393939;border:1px solid #666666;color:#ccc;font:normal 15px 'Tahoma', Arial, Helvetica, sans-serif;} </style>").appendTo("head");
$("<style type='text/css'> .coolbutton{ margin-left:0.5em;display:inline-block;cursor:pointer} </style>").appendTo("head");
$("<style type='text/css'> .unselectable{ -webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;} </style>").appendTo("head");


//------------------------------------------------------------------          PART I               -------------------------------------------------------------------------------------*/
if (window.location.href.contains(["Episode", "Movie"]) && $("#selectEpisode").length > 0){
    //Quality fix (login error, due to dependency on localStorage)
    if (isNaN(global_settings.quality)) global_settings.quality = parseInt($("#selectQuality option:selected").text().replace("p",""));
    UpdateGlobalSettings();

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
        $("#divDownload").append($("<a>", {html:cQuality+"p", class:"downloadLink", style:"cursor:pointer"}));
    });

    $(document).on("click", ".downloadLink", function(){
        DownloadCurrent($(this).text().replace("p", ""));
    });

    //------------------------------------------------------------------          PART II              -------------------------------------------------------------------------------------*/
} else if ($(".listing").length > 0){ 
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
        var settings = JSON.parse(link.split("#")[1].replace(/\%22/g,'"')); //settings is an object including title, remain, link, host, downloadTo
        $('body').remove(); //Stop video
        SaveToDisk(link, settings); //Save
    }
}

function SaveToDisk(link, settings){
    var save = document.createElement('a');
    save.href = link.split("#")[0]+"&title="+settings.title
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

    setTimeout(function(){window.parent.postMessage({'id':settings.remain}, settings.host);}, 500); //Iframe parent message    
}

//------------------------------------------------------------------         CONSTRUCTION          -------------------------------------------------------------------------------------*/
function MakeBar(page){
    if (page === 'episode'){
        bar = $('#selectPlayer').parent().parent(); //The bar that contains quality + download buttons
        MakeMultiple("multAmount", "Select the amount of episodes after and including the starting episode");
        MakeButton({first:true, id:"dlButton", text:"Download", handler:"main"});
        MakeQuality();
        MakeCheck();
    } else if (page === 'series'){
        $(".listing").before($("<div>", {id:'bar'}));
        bar = $("#bar");
        MakeMultiple("multSelect", "Select the episode you would like to start downloading from");
        MakeMultiple("multAmount", "Select the amount of episodes after and including the starting episode");
        MakeQuality();
        MakeButton({id:"dlButton", text:"Download", handler:"main"});
        MakeButton({id:"dlButton_sel", text:"Download Selected", handler:"select", disabled:true});
        MakeCheck();
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

function MakeButton(params){ //Makes the download button, params include id, text, handler, first, disabled
    button = $("<input>", {
        id:params.id,
        type:"button",
        value:params.text,
        class:"coolfont coolbutton"
    }).click(function(){MainDl($(this), params, indexes)});
    bar.append(button);
    if (params.disabled) ButtonState(params.id, false);
    
    function MainDl($this, params, indexes){
        if ($this.hasClass("disabled") === false){
            ButtonState(params.id, false);
            
            global_settings.quality = parseInt($("#selectQuality option:selected").text().replace("p",""));
            if (isNaN(global_settings.quality)) global_settings.quality = 720; //Temporary fix
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

                //If the information for the first download is on the page....
                if (params.first){
                    indexes.shift(); //Removes first item from array
                    DownloadCurrent(global_settings.quality, params.id); //This also decrements remain when found...
                }
            } else if (params.handler === 'select'){ //If it is the select button
                remain = indexes.length;
            }

            //Confirmation box
            if (indexes.length > 0){
                window.onbeforeunload = function() {
                    return "Leaving this page will cancel some of your downloads!";
                };
                DownloadVideos(indexes, params.id); //Download the videos with the given indexes
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

function MakeCheck(){ //Makes the boolean checkboxes (currently Remove Dub/Sub)
    var check = $("<input>", {
        id:'remSubDub',
        type:'checkbox',
        class:'unselectable',
        style:'margin-left:0.8em;',
        title:'Use this checkbox to rename the files with or without the (dub) and (sub) tags'
    });
    if (global_settings.remSubDub === true) check.prop("checked", true);
    check.change(function(){
        global_settings.remSubDub = $('#remSubDub').is(':checked');
        UpdateGlobalSettings();
    });

    label = "<label for='remSubDub'> Remove Dub/Sub</label>";
    bar.append(check);
    $("#remSubDub").after(label);
}

$(document).mousedown(function(e){
    if (e.which === 1) isDown = true;
}).mouseup(function(e){
    if (e.which === 1) isDown = false;
});

function MakeCheckboxes(){
    var style = ".checkbox{ vertical-align:middle;}";
    style += " .hovered{ background:#660000!important;color:yellow}";
    $("<style type='text/css'>"+style+"</style>").appendTo("head");

    var length = $("table.listing tr:gt(1)").length;
    function MouseHandle(e, $this){
        if (isDown || e.data.force){
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
        }
    }
    $("table.listing tr:gt(1)").each(function(){
        $(this).addClass("unselectable");
        $(this).mouseover({force:false}, function(e){MouseHandle(e, $(this))});
        $(this).mousedown({force:true}, function(e){if (e.which === 1) MouseHandle(e, $(this))});

        var $text = $(this).find("td").eq(0);
        var index = length - ($(this).index()-1);
        $text.html("<input type='checkbox' class='checkbox' index='"+index+"'>"+$text.html());
    });
    $(".checkbox").click(function(e){
        e.preventDefault();
    });
}

//------------------------------------------------------------------            MISC               -------------------------------------------------------------------------------------*/
//Core downloading functions
function DownloadCurrent(quality, id){
    var url = asp.wrap($("#selectQuality option:contains('"+quality.toString()+"')").attr("value"));
    var titleText = $("title").text();
    GetExtVid(url, titleText, id);
}

function DownloadVideos(indexes, id){ //Where indexes refer to the indexes of the videos
    indexes.sort(sortNumber);
    for (var i = 0; i<indexes.length; i++){ //Download the videos
        CreateAnother(indexes[i], id);
    }
}

function sortNumber(a,b) {
    return Number(a) - Number(b);
}

function CreateAnother(index, id){
    var newUrl = eps[index];
    $.get(newUrl, function(xhr){
        var $div = $("<div>").html(xhr.split("selector")[1].split("</div>")[0]);
        var url = asp.wrap($div.find('option:contains("'+global_settings.quality.toString()+'")').attr('value'));
        var titleText = xhr.split("<title>")[1].split("</title>")[0];
        GetExtVid(url, titleText, id);
    });
}

function GetExtVid(url, titleText, id){ //Get the link for a new video
    var title = (titleText.split("- Watch")[0].replace(/\n/g, " ")).trim();
    GetVid(url, title);
    remain--;
    if (remain === 0) window.onbeforeunload = null, setTimeout(function(){ButtonState(id, true)}, 500); //Remove leave confirmation
}

function GetVid(link, title){ //Force the download to be started from an iframe (why not do this locally? The file doesn't name properly, can't find fix!)
    if (global_settings.checked === "true"){
        title = title.replace(" (Dub)", "").replace(" (Sub)", "");
    }
    var settings = {"title":encodeURIComponent(title), "remain":remain, "host":window.location.href.split(".com")[0]+".com", "downloadTo":global_settings.downloadTo}
    iframe = $("<iframe>", { //Send video to other script to be downloaded.
        src: link + "#" + JSON.stringify(settings),
        style: "width:0;height:0",
        id: 'dlExt'+remain,
        class: 'extVid'
    });
    $("body").append(iframe);
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
        return !($("#"+id).hasClass("disabled"))
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
                $("#dlExt"+e.data.id).remove();
            }
        }
    }, false); 
});