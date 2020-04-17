require('dotenv').config();
var nodemailer = require('nodemailer');

module.exports = (requestObject) => {
  // create the message header
  var message = 'New Dealer Registration<br>------------------------<br>';
  var sendTo;
  var attachments = [];

  // add all of the form fields to the message text
  Object.entries(requestObject.body).forEach(
    formField => {
      if(formField[0] == 'testing-sendTo') {
        sendTo = formField[1];
      } else if(formField[0] == 'signature' ) {
        attachments.push({
          filename: 'signature.png',
          content: new Buffer(formField[1].split(',')[1], 'base64'),
          cid: 'signature'
        })
      } else {
        message += `${formField[0]}: ${formField[1]} <br>`;
      } 
    }
  );

  // add all of the files to the attachment array
  if(requestObject.files) {
    if (!Array.isArray(requestObject.files.photos)) {
      attachments.push({
        filename: requestObject.files.photos.name,
        content: requestObject.files.photos.data
      })
    } else {
      Object.entries(requestObject.files.photos).forEach(
        photoArr => {
          attachments.push({
            filename: photoArr[1].name,
            content: photoArr[1].data,
          });
        }
      );
    }
  }

  // embed the signature
  message += '<img src="cid:signature">'

  // initialize transport object with email credentials
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  });

  // configure the message
  const mailOptions = {
    from: 'sbdealerform@gmail.com', 
    to: sendTo ? sendTo : process.env.SENDTO, // will eventually be the SB filters address, possibly their servicedesk account
    subject: 'New Dealer Registration',
    html: message, // message text variable
    attachments: attachments // attachment array
  };

  // send the message, listen for error
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  }); 

}