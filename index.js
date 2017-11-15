const EXPRESS = require('express');
const APP = EXPRESS();
const REQUEST = require("request");
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const path = require("path");
const MONGO_LINK = "mongodb://nitin:admin123@ds259245.mlab.com:59245/googleimagesearch";

APP.listen(process.env.PORT || '3000');

APP.get('/', function (req, res) {
    res.sendFile('views/index.html', {root: __dirname })
});

APP.use("/public", EXPRESS.static('public'));



APP.get('/history', function (req, res) {
    res.sendFile('views/history.html', {root: __dirname })
});


APP.get('/search', function(req, res) {
    var path1 = "";
    var count = 0;
    var resSend = false;
    const searcKeyword    =   req.query.keyword;
    MongoClient.connect(MONGO_LINK, function (err, db) {
		if(!err){
			db.collection('searchKeywords').insertOne({"inputKey" : searcKeyword}, function(err, r) {
                var fileName = "", nodes = "", i;
                var folderName = __dirname+"/public/"+searcKeyword+"/";
                if (!fs.existsSync(folderName)){
                    fs.mkdirSync(folderName);
                }
                var download = function(uri, callback){
                    REQUEST.get(uri, function(err, res, body){
                        const cheerio = require('cheerio');
                        const $ = cheerio.load(body);
                        nodes = $("img");
                        var imgArray = [];
                        for(i=0; i<nodes.length; i++){
                            imgArray.push(nodes[i].attribs.src);
                            if(i > 13){
                                callback(err, imgArray, body);
                                break;
                            }
                        }
                    });
                };
       
                var searchURL   =   "https://www.google.com/search?tbm=isch&q="+searcKeyword;
                download(searchURL, function(err, response, body){
                    for(i=0; i<response.length; i++){
                        fileName = folderName+i+".png";
                        var count = 0;
                        REQUEST(nodes[i].attribs.src, i).pipe(fs.createWriteStream(fileName)).on('close', function(i){
                            count++;
                            if(count > 14){
                                modifyImage(folderName, res);    
                            }
                        });
                        
                    }
                });
            
                function modifyImage(path, rs){
                    fs.readdir(path, function(err, items) {
                        render(path, items.length, rs);
                    })
                }
                
                function render(path, items, rs){
                    var Jimp = require("jimp");
                    path1 = path;
                    for(i=0; i<items; i++){
                        path = "";
                        path = path1+i+".png";
                        path = path.replace("\\", "/");
                        Jimp.read(path, function (err, image) {
                            image.greyscale().resize(150, Jimp.AUTO).write(path1+count+".png", function(){
                                if(!resSend){
                                    rs.send("Download completed successfully.<br><a onClick='(function (){location.href = location.origin})()' style='cursor: pointer'>Back</a>");
                                    resSend = true;
                                }
                            });    
                            count++;
                        });
                    }
                }
			});		  
		}
    });
});


APP.get("/historyLinks", function (req, res){
    
    MongoClient.connect(MONGO_LINK, function (err, db) {
        if(!err){
            var query = 'db.getCollection("searchKeywords").find({})';
            db.collection('searchKeywords', function(err, collection) {
                collection.find().toArray(function(err, items) {
                    console.log(items);
                    res.send(items);
                });
            });
        }
    });
});

var key;
APP.get("/getImages/:key", function (req, res){
    key = req.params.key;
    var imgPaths = [];
    var imgDir = __dirname+"/public/"+key+"/";
    var html = "<hade><style>.scrapImages{width: 225px;height: 200; float: left;}</style></head>";
    fs.readdir(imgDir, function(err, items) {
        if(err){
            html = "No Images found";
        }
        else{
            for(i=0; i<items.length; i++){
                html += "<div class='scrapImages'><img src='./../public/"+key+"/"+items[i]+"' /></div>";
            }
        }
        res.send(html);
    });
});