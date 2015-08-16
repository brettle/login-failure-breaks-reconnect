var username1 = 'testuser1';
var username2 = 'testuser2';
var password1 = 'password1'
var password2 = 'password2'

if (Meteor.isServer) {
  Meteor.methods({
    getConnectionUserId: function() {
       return this.userId;
    }
  });
  Meteor.users.remove({username: username1});
  Meteor.users.remove({username: username2});
  Accounts.createUser({
    username: username1,
    password: password1
  });
  Accounts.createUser({
    username: username2,
    password: password2
  });
}

if (Meteor.isClient) {
  var timeoutHandle;
  Meteor.startup(function () {
    console.log('Logging in as: ' + username1);
    Meteor.loginWithPassword(username1, password1, onUser1LoggedIn);
  });

  function onUser1LoggedIn(err) {
    check(err, undefined); // No error
    console.log('Successfully logged in as: ' + Meteor.user().username);
    console.log('Logging in as: ' + username2);
    Meteor.loginWithPassword(username2, password2, onUser2LoggedIn);
  }

  function onUser2LoggedIn(err) {
    check(err, undefined); // No error
    console.log('Successfully logged in as: ' + Meteor.user().username);
    console.log('Forcing a reconnect should cause us to relogin...');
    Accounts.onLogin(onUser2LoggedInAfterReconnect);
    Meteor.disconnect();
    Meteor.reconnect();
  }

  function onUser2LoggedInAfterReconnect() {
    console.log('Logged in after reconnect as: ' + Meteor.user().username);
    console.log('Intentionally causing login failure...');
    Meteor.loginWithPassword('non-existent-user', 'or-wrong-password',
      onFailedLogin);
  }

  function onFailedLogin(err) {
    check(err, Meteor.Error); // We expected an error
    console.log('Login failed (as planned) but we are still correctly logged in as: '
      + Meteor.user().username);
    console.log('Forcing reconnect should still cause us to relogin');
    Accounts.onLogin(onUser2LoggedInAfterReconnectAfterFailedLogin);
    Meteor.disconnect();
    Meteor.reconnect();
    timeoutHandle = Meteor.setTimeout(sayBugStillPresent, 1000);
  }

  function sayBugStillPresent() {
    console.log('Login on reconnect does not work after login failure');
    Meteor.call('getConnectionUserId', showFinalState);
  }

  function onUser2LoggedInAfterReconnectAfterFailedLogin() {
    Meteor.clearTimeout(timeoutHandle);
    console.log('The bug is fixed. We were relogged in as:'
      + Meteor.user().username);
    Meteor.call('getConnectionUserId', showFinalState);
  }

  function showFinalState(err, connectionUserId) {
    check(err, undefined); // No error
    console.log('this.userId in server method: ' + connectionUserId);
    console.log('Meteor.userId() on client: ' + Meteor.userId());
    var user = Meteor.user();
    if (user) {
      console.log('Meteor.user().username on client: ' + user.username);
    } else {
      console.log('Meteor.user() on client: ' + user);
    }
  }
}
