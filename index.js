const fs = require('fs');
const {google} = require('googleapis');
require('dotenv').config();

// Load client secrets from a file
const scopes = process.env.SCOPES;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

const TOKEN_PATH = 'token.json';

// Set up OAuth2 client
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);


// Check if we have previously stored a token
fs.readFile(TOKEN_PATH, (err, token) => {
  if (err) return getAccessToken(oauth2Client);
  oauth2Client.setCredentials(JSON.parse(token));

  const fileId = "fileId"
  const newOwnerEmail ="newOWnerEmail"
  
  //Once authenticated, log the capabilities by calling an API method
  if(fileId && newOwnerEmail){
    initiateOwnershipTransfer(fileId, newOwnerEmail);
  }
});

// Function to get access token if it's not stored
function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
} 

// Function to check Drive capabilities
/**
 * Initiate ownership transfer by the current owner.
 * @param {string} fileId - The ID of the file you want to transfer ownership of.
 * @param {string} newOwnerEmail - The email address of the new prospective owner.
 */
function initiateOwnershipTransfer(fileId, newOwnerEmail) {
  
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // First, make the new owner a writer on the file
    drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'writer',               // Temporarily set the new owner as a writer
      type: 'user',                 // Type is 'user' for a specific person
      emailAddress: newOwnerEmail   // New owner's email
    },
    fields: 'id',
    sendNotificationEmail: true     // Send an email to the prospective owner
  }, (err, res) => {
    if (err) {
      console.error('Error creating writer permission:', err);
      return;
    }
    const permissionId = res.data.id;
    console.log(`Writer permission created. Permission ID: ${permissionId}`);

    // Next, update the permission to transfer ownership
 drive.permissions.update({
      fileId: fileId,
      permissionId: permissionId,  // Use the permission ID from the previous response
      requestBody: {
        role: 'writer',
        pendingOwner: true          // make the new owner the pending owner
      },
      fields: 'id'
    }, (err, res) => {
      if (err) {
        console.error('Error updating permission with pendingOwner:', err);
        return;
      }
      console.log('Ownership transfer initiated with pendingOwner set to true.');
   
    // Now retrieve and verify the permissions to ensure pendingOwner is set
    drive.permissions.list({
      fileId: fileId,
      fields: 'permissions(id, type, emailAddress, role, pendingOwner)'
    }, (err, res) => {
      if (err) {
        console.error('Error retrieving permissions:', err);
        return;
      }
      console.log('Permissions:', res.data.permissions);
    });
  });
})
//   drive.permissions.delete({
//   fileId: fileId,
//   permissionId: 'existing-permission-id'
// }, (err, res) => {
//   if (err) {
//     console.error('Error deleting permission:', err);
//   }
//   console.log('Permission removed. Now retry transfer.');
// });

}
