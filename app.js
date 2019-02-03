const express = require('express');
const port = 3000;
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var session = require('express-session');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'ssshhhhh' }));

var mysql = require('mysql')
var db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'qwer1234',
  database : 'fsechat'
});

db.connect();

app.get("/", function (req, res) {
  res.render("index");
});

app.post("/", function(req, res) {
  var user = req.body.username;
  var select_sql = 'SELECT * FROM users WHERE user_id="' + user +'"';
  var insert_sql = 'INSERT INTO users (user_id, password) VALUES (?,?)' ;
  
  db.query(select_sql, function (err, rows, fields) {
    if (err) throw err;
    if (rows.length > 0) {
			console.log('id already exists');
      if(req.body.psw != rows[0].password) {
        res.render("index", {error_msg: "wrong password"});
      } else {
				req.session.user_id = user;
				res.redirect('/chats');
			}
    } else {
			console.log('id doesnt exist');
        db.query(insert_sql, [user, req.body.psw], function( err, data) {
            if (err) console.log(err);
            else {
							req.session.user_id = user;
              res.redirect('/chats');
            }
        });
    } 
  });
});

app.get("/chats", loggedIn, function (req, res) {
  db.query('SELECT * FROM chats' , function (err, rows, fields) {
    if (err) throw err
    res.render("chat", {data: rows, user: req.session.user_id});
  });
});

function loggedIn(req, res, next) {
  if (req.sessionID && req.session.user_id) return next();
  res.redirect('/');
}

app.set("view engine", "ejs");
app.use(express.static('./'));

io.on('connection', function(socket){
  console.log('user connected');
  
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    var sql = 'INSERT INTO chats (user_id, message, time) VALUES (?,?,?)'; 
    db.query(sql, [msg.user_id, msg.message, msg.time], function( err, data) {
      if (err) console.log(err)
      else console.log('successfully inserted into db')
    });
  });
  
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

app.post("/chats", function(req, res) {
	req.session.destroy(function(err) {
		if(err) {
			console.log(err);
		} else {
			res.redirect('/');
		}
	});
});

http.listen(port, function(){
  console.log(`listening on *:${port}`);
});
