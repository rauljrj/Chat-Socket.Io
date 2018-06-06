var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var fs = require('fs');
var mediaserver = require('mediaserver');
var multer = require('multer');


var opcionesMulter = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, path.join(__dirname, 'canciones'));
    },
    fileName: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

var upload = multer({storage: opcionesMulter});

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(express.static('public'));

app.get('/canciones', function(req, res) {
 fs.readFile(path.join(__dirname, 'canciones.json'), 'utf8', function(err, canciones){
     if(err) throw err;
     res.json(JSON.parse(canciones));
 });
});

app.get('/canciones/:nombre', function(req, res){
    var cancion = path.join(__dirname, 'canciones', req.params.nombre);
    mediaserver.pipe(req, res, cancion);
});


app.post('/canciones', upload.single('cancion'), function(req, res){
   var nombre = req.file.originalname;
    fs.readFile(path.join(__dirname, 'canciones.json'), 'utf8', function(err, archivo){
       if (err) throw err;
       var canciones = JSON.parse(archivo);
        canciones.push({nombre: nombre});
        fs.writeFile(path.join(__dirname, 'canciones.json'), JSON.stringify(canciones), function(err){
          if (err) throw err;
           res.sendFile(path.join(__dirname, '/public/index.html'));
        });
    });
});

var numUsers = 0;

io.on('connection', (socket) => {
  var addedUser = false;

  socket.on('new message', (data) => {
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });
  socket.on('play', (data) =>{
        socket.emit('play');
    });

  socket.on('add user', (username) => {
    if (addedUser) return;

    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    socket.broadcast.emit('user joined', {
      username: socket.username, 
      numUsers: numUsers
    });
  });


  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});