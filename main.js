// ==UserScript==
// @name         KissAnime/Cartoon Downloader
// @namespace    https://greasyfork.org/users/10036
// @version      0.23
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
}

//Global
var remain = 0;  //How many downloads remain...
var eps = [];  //An array of the episode data
var bar;
var quality = localStorage.quality || parseInt($("#selectQuality option:selected").text().replace("p","")); //Quality selected
var checked = localStorage.checked || false; //The checkbox
$("<style type='text/css'> .disabled{ cursor:default!important; color:black!important;} </style>").appendTo("head");

//------------------------------------------------------------------          PART I               -------------------------------------------------------------------------------------*/
if (window.location.href.contains(["Episode", "Movie"]) && $("#selectEpisode").length > 0){
    bar = $('#selectPlayer').parent().parent(); //The bar that contains quality + download buttons

    //Quality fix (login error)
    if (isNaN(quality)) quality = parseInt($("#selectQuality option:selected").text().replace("p",""));

    //Fix styling
    $("#selectPlayer option").each(function(){
        $(this).html($(this).html().replace("(lightweight, mobile supported)", "").replace("(can preload entire video)", ""));
    });
    $('#switch').parent().children().css('width', 'auto');
    $('#switch').html($('#switch').html().replace("Turn off the light", "Off"));

    MakeMultiple("multSelect", "Select the amount of episodes after and including the starting episode");
    MakeQuality();
    MakeButton(true);
    MakeCheck();

    //Code here for local download links!!!
    $("#divDownload").html("Download video: ");
    var first = true;
    $("#selectQuality option").each(function(){
        (first) ? first = false : $("#divDownload").html($("#divDownload").html() + " - ");
        var quality = parseInt($(this).text().replace("p", ""));
        $("#divDownload").append($("<a>", {html:quality+"p", class:"downloadLink", style:"cursor:pointer"}));
    });

    $(document).on("click", ".downloadLink", function(){
        DownloadCurrent($(this).text().replace("p", ""));
    });

    //------------------------------------------------------------------          PART II              -------------------------------------------------------------------------------------*/
} else if ($(".listing").length > 0){ 
    $.getScript("/scripts/asp.js", function(){ //This script is required for some functionality (the asp functions, asp.wrap)
        $(".listing").before($("<div>", {id:'bar'}));
        bar = $("#bar");
        MakeMultiple("multSelect", "Select the episode you would like to start downloading from");
        MakeMultiple("multAmount", "Select the amount of episodes after and including the starting episode");
        MakeQuality();
        MakeButton(false);
        MakeCheck();

        $("#multSelect").change(function(){
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
        $('body').remove(); //Stop video
        title = decodeURIComponent(link.split('#')[1].split("|")[0])+".mp4"; //Get title name
        SaveToDisk(link, title); //Save
    }
}

function SaveToDisk(link, fileName){
    var save = document.createElement('a');
    save.href = link.split("#")[0];
    save.target = '_blank';
    save.download = fileName || 'unknown';    
    
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

    setTimeout(function(){window.parent.postMessage(link.split("|")[1], link.split("|")[2]);}, 500) //Iframe parent message    
}

//------------------------------------------------------------------         CONSTRUCTION          -------------------------------------------------------------------------------------*/
function MakeQuality(){
    if ($('#selectQuality').length > 0){
        $("#selectQuality").parent().css("display", "inline-block");
    } else {
        if (typeof setCookie == 'function') setCookie("usingFlashV1", false);
        bar.append($("<select>", {
            id: "selectQuality"
        }));
        $.get(eps[0], function(xhr){
            var $div = $("<div>").html(xhr.split("selector")[1].split("</div>")[0]);
            var url = $div.find('option').each(function(){
                $("#selectQuality").append($("<option>", {html:$(this).text()}));
            });
        });
    }
}

function MakeButton(firstDownload){
    button = $("<input>", {
        id:"dlButton",
        type:"button",
        value:"Download",
        style:"background-color:#393939;border:1px solid #666666;color:#ccc;font:normal 15px 'Tahoma', Arial, Helvetica, sans-serif;margin-left:0.5em;display:inline-block;cursor:pointer"
    }).click(function(){
        if ($(this).hasClass("disabled") === false){
            $(this).addClass("disabled"); 
            $(this).attr("disabled", ""); //This removes the blue highlighting
            quality = parseInt($("#selectQuality option:selected").text().replace("p",""));
            if (!isNaN(quality)) localStorage.quality = quality; //If quality is a number...
            if (isNaN(quality)) quality = 720; //Temporary fix

            var count = parseInt($("#multSelect").val(), 10);
            var startIndex = 0;

            if ($("#multAmount").length > 0){
                count = parseInt($("#multAmount").val(), 10);
                startIndex = parseInt($("#multSelect").val(), 10) - 1;
            }

            remain = count;

            //If the information for the first download is on the page....
            if (firstDownload){
                count -= 1;
                startIndex += 1;
                DownloadCurrent(quality);
            }

            //Confirmation box
            if (count > 0){
                window.onbeforeunload = function() {
                    return "Leaving this page will cancel some of your downloads!";
                };
                DownloadVideos([startIndex, count]); //Download the videos, starting index, amount
            }
        }
    });
    bar.append(button);
}

function MakeMultiple(id, info){
    multiple = $("<select>", {
        id:id,
        style:"background-color:#393939;color:#ccc;border:1px solid #666666;font:normal 15px 'Tahoma',Arial,Helvetica,sans-serif",
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

function MakeCheck(){
    check = $("<input>", {
        id:'dlCheck',
        type:'checkbox',
        style:'margin-left:0.8em;-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;-o-user-select: none;user-select: none;',
        title:'Use this checkbox to rename the files with or without the (dub) and (sub) tags'
    });
    if (checked === "true") check.prop("checked", true);
    check.change(function(){
        checked = $('#dlCheck').is(':checked');
        localStorage.checked = checked;
    });

    label = "<label for='dlCheck'> Remove Dub/Sub</label>";
    bar.append(check);
    $("#dlCheck").after(label);
}

//------------------------------------------------------------------            MISC               -------------------------------------------------------------------------------------*/
//Core downloading functions
function DownloadCurrent(quality){
    var url = asp.wrap($("#selectQuality option:contains('"+quality.toString()+"')").attr("value"));
    var titleText = $("title").text();
    GetExtVid(url, titleText);
}

function DownloadVideos(range){ //Where range is in the form [startingIndex, amount]
    var startingIndex = range[0];
    var amount = range[1];
    for (var i = startingIndex; i<amount+startingIndex; i++){ //Download the videos
        CreateAnother(i);
    }
}

function CreateAnother(index){
    var currUrl = window.location.href;
    var newUrl = eps[index];

    $.get(newUrl, function(xhr){
        var $div = $("<div>").html(xhr.split("selector")[1].split("</div>")[0]);
        var url = asp.wrap($div.find('option:contains("'+quality.toString()+'")').attr('value'));
        var titleText = xhr.split("<title>")[1].split("</title>")[0];
        GetExtVid(url, titleText);
    });
}

function GetExtVid(url, titleText){ //Get the link for a new video
    var title = (titleText.split("- Watch")[0].replace(/\n/g, " ")).trim();
    GetVid(url, title);
    remain--;
    if (remain === 0) window.onbeforeunload = null, setTimeout(EnableButton, 500); //Remove leave confirmation
}

function GetVid(link, title){ //Force the download to be started from an iframe (why not do this locally? The file doesn't name properly, can't find fix!)
    if (checked === "true"){
        title = title.replace(" (Dub)", "").replace(" (Sub)", "");
    }
    iframe = $("<iframe>", { //Send video to other script to be downloaded.
        src: link + "#" + encodeURIComponent(title) + '|' + remain + '|' + window.location.href.split(".com")[0]+".com",
        style: "width:0;height:0",
        id: 'dlExt'+remain,
        class: 'extVid'
    });
    $("body").append(iframe);
}

function EnableButton(){
    $("#dlButton").removeClass("disabled");
    $("#dlButton").removeAttr("disabled");
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
                $("#dlExt"+e.data).remove();
            }
        }
    }, false); 
});