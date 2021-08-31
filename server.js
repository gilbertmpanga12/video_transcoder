#!/usr/bin/env nodejs
// clean commit
const express = require('express');
const admin = require("firebase-admin");
const helmet = require('helmet');
const cors = require('cors');
const app = express();
const http = require('http').Server(app);
const environment = require('dotenv').config();
const Fs = require('fs');
const Path = require('path'); 
const Axios = require('axios');
const bodyParser = require('body-parser');
var spawn = require('child_process').spawn;
// set security headers
app.use(helmet());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json({limit: '1000mb'}));

admin.initializeApp({
credential: admin.credential.cert(
      {
        "type": process.env.service_account,
        "project_id": process.env.project_id,
        "private_key_id": process.env.private_key_id,
        "private_key": process.env.private_key,
        "client_email": process.env.client_email,
        "client_id": process.env.client_email.client_id,
        "auth_uri": process.env.auth_uri,
        "token_uri": process.env.token_uri,
        "auth_provider_x509_cert_url": process.env.auth_provider_x509_cert_url,
        "client_x509_cert_url": process.env.client_x509_cert_url
      }
),
    databaseURL: "https://esalonbusiness-d3f3d.firebaseio.com"
});

app.post('/crucken-transcord', (req,res) => {
    const uid = req.body['uid'],imageUrl = req.body['imageUrl'];
    const fileName = `${Math.floor((Math.random() * 1000000) + 1)}`;
    const isBusiness = req.body['isBusiness'];
    const isChat = req.body['isChat'];
    const userChatId = req.body['messageId'];
    downloadImage(imageUrl,fileName,isChat, userChatId).then(() => {
    trascoder(uid,fileName,isBusiness).then(() => {
    async function downloadImage (weburl,filePlaceHolder) {
    const url = weburl;
    const path = Path.resolve(__dirname, filePlaceHolder + '.mp4');
    const writer = Fs.createWriteStream(path)

    const response = await Axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  })
}

async function trascoder(uid,filePlaceHolder,isBusiness,isChat,userChatId){
 const cmd = '/usr/bin/ffmpeg';
 const path = Path.resolve(__dirname, filePlaceHolder + '.mp4');
 const pngFile = filePlaceHolder + '.png';
//  const finalPath = Path.resolve(__dirname, 'temp/coco.png');
 const args = [
    '-i',
    path,
    '-ss',
    '00:00:01',
    '-vframes',
    '1',
    pngFile
];

const proc = spawn(cmd, args);

proc.stdout.on('data', function(data) {
    console.log(data);
   
});

proc.stderr.on('data', function(data) {
    console.log(data);
    return Promise.resolve();

});

proc.on('close', function() {
    console.log('finished');

uploadToStorageBucket(uid,filePlaceHolder,isBusiness,isChat,userChatId);
    // return Promise.resolve();
});
}

async function uploadToStorageBucket(uid,filePlaceHolder,isBusiness,isChat,userChatId) {
    console.log(uid,filePlaceHolder,isBusiness)
    const transcodedImage = Path.resolve(__dirname,`${filePlaceHolder + '.png'}`);
    const storageBucket = admin.storage().bucket('gs://esalonbusiness-d3f3d.appspot.com');
    admin.storage().bucket('gs://esalonbusiness-d3f3d.appspot.com').upload(transcodedImage).then((val) => {
        storageBucket.file(`${filePlaceHolder + '.png'}`).getSignedUrl({
            action: "read",
            expires: '03-17-2025' // this is an arbitrary date
        })
        .then( data => {
const clippedImage = data[0];
if(isChat){
    //  Firestore.instance
//           .collection('users')
//           .document(transactionalID)
//           .collection('chats')
//           .document(chatUid).setData({'defaultVideo'});
admin.firestore().collection('users')
.doc(uid).collection('chats')
.doc(userChatId).set({pathAvailable:clippedImage},{merge:true}).then((result) => {
    deleteCoco(`${filePlaceHolder + '.mp4'}`,`${filePlaceHolder + '.png'}`);
    return  Promise.resolve();
}).catch((err) =>{
    deleteCoco(`${filePlaceHolder + '.mp4'}`,`${filePlaceHolder + '.png'}`);
    return  Promise.reject();
});
}
if(isBusiness){
// console.log('I am termonotor');
// console.log(clippedImage);
    admin.firestore().collection('servicesvideofeed').doc(uid)
    .set({videoDefault: clippedImage}, {merge: true}).then((result) => {
       deleteCoco(`${filePlaceHolder + '.mp4'}`,`${filePlaceHolder + '.png'}`);
        return  Promise.resolve();
    }).catch((error) => {
     deleteCoco(`${filePlaceHolder + '.mp4'}`,`${filePlaceHolder + '.png'}`);
    return  Promise.reject();
    });

}else{
    admin.firestore().collection('userService').doc(uid)
.set({videoDefault: clippedImage}, {merge: true}).then((v) => {
    deleteCoco(`${filePlaceHolder + '.mp4'}`,`${filePlaceHolder + '.png'}`);
    return  Promise.resolve();
}).catch((err) => {
    deleteCoco(`${filePlaceHolder + '.mp4'}`,`${filePlaceHolder + '.png'}`);
    return  Promise.reject();
});

}

      }  );
        
    }).catch(err => {
        console.log(err);
        return Promise.reject();
    });
}

 function deleteCoco(videoName,pictureName) {
    const videoFile = Path.resolve(__dirname, videoName);
    const transcodedImage = Path.resolve(__dirname,pictureName);
    const filePaths = [videoFile,transcodedImage];
    for(let path of filePaths){
        Fs.unlink(path, (err) => {
            if (err) {
              console.error(err)
              return
            }
          console.log('deleted the file successfully');
            //file removed
          });
    }
    
}


app.get('/',(req,res) => res.send({'Message':'We are live'}));

http.listen(8080, () => {//process.env.PORT
    console.log('Started transcoder server at:' + '8080');
});