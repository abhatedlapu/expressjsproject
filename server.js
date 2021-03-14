const express = require('express');
const axios = require('axios');
var cache = require('memory-cache');
var router = express.Router();
const app = express();
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
var DB = require('nosql');
var nosql = DB.load("dbfile.nosql", { root : __dirname});

function ValidateEmail(mail)
{
console.log(mail);
return /^.+@.+\..+$/.test(mail);
}

function authXuser(req, res, next) {
		if (req.get('x-user')) {
				if(ValidateEmail(req.get('x-user'))){
					nosql.insert({ user: req.get('x-user'),url:req.originalUrl,body:req.body,timestamp:Date.now() })
		    	next();
				}
				else{
					next(new Error('Unauthorized Email address'));
				}
	  }
		else {
	    next(new Error('x user parameter is missing in request header'));
	  }
}

app.use(function(req, res, next){
	req.headers['x-user'] = "abha.goel@gmail.com"
	console.log("middleware");
  next();
});


app.post('/getBeerDetails', authXuser, (req, res) => {
	var b_name 	= req.body.beerName;
	var flag 	= false;
	if(cache.get(b_name) != null) {
		res.end(cache.get(b_name));
	} else {
		axios.get("https://api.punkapi.com/v2/beers")
		.then((info)=>{
			for(var item in info.data){
				if(!(info.data[item]["name"].localeCompare(b_name))){
					flag				= true;
					var obj_id 			= info.data[item]["id"];
					var obj_name 		= info.data[item]["name"];
					var obj_desc 		= info.data[item]["description"];
					var obj_first_brew 	= info.data[item]["first_brewed"];
					var obj_food_pair 	= info.data[item]["food_pairing"];
					var response_json 	= JSON.stringify({
						"id"			: obj_id,
						"name"			: obj_name,
						"description"	: obj_desc,
						"first_brewed"	: obj_first_brew,
						"food_pairing"	: obj_food_pair	
					});
					cache.put(b_name, response_json);
					res.end(response_json);
				}
			}
			if(!flag) {
				return res.json({"error": "Item "+b_name+" not found"})
			}		
		})
	}
});

app.post('/loadRating',authXuser, (req, res) => {
	var b_id = req.body.beer_id;
	console.log(b_id);
	axios.get("https://api.punkapi.com/v2/beers")
	.then((info)=>{
		for(var item in info.data){
			if(info.data[item]["id"]==b_id){
				nosql.insert({ id: req.body.beer_id,rating:req.body.rating,comment:req.body.comment });
				return res.send("Successfully Inserted");
			}
		}
		return res.send("Invalid beer id");
	})
})


app.get('/',authXuser, (req, res) => {
	res.sendFile('home.html' , { root : __dirname});
})


const port = process.env.PORT || 3000 ;
app.listen(port, () => {
console.log(port);
});

module.exports = app;
