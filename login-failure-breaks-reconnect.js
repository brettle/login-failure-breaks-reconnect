if (Meteor.isServer) {
  Meteor.methods({
    getConnectionUserId: function () {
      return this.userId;
    }
  });
}

if (Meteor.isClient) {
  var username1 = 'testuser1-' + Random.id();
  var username2 = 'testuser2-' + Random.id();
  var password1 = 'password1-' + Random.id();
  var password2 = 'password2-' + Random.id();
  var timeoutHandle;

  Template.body.helpers({
    logContents: function () {
      return Session.get('logContents');
     }
  });

  function log(msg) {
    console.log(msg);
    Session.set('logContents', Session.get('logContents') + msg + '\n');
  }

  Meteor.startup(function() {
    Session.set('logContents', '');
    log('Logging in as: ' + username1);
    Accounts.createUser({
      username: username1,
      password: password1
    }, onUser1LoggedIn);
  });

  function onUser1LoggedIn(err) {
    check(err, undefined); // No error
    log('Successfully logged in as: ' + Meteor.user().username);
    log('Logging in as: ' + username2);
    Accounts.createUser({
      username: username2,
      password: password2
    }, onUser2LoggedIn);
  }

  function onUser2LoggedIn(err) {
    check(err, undefined); // No error
    log('Successfully logged in as: ' + Meteor.user().username);
    log('Forcing a reconnect should cause us to relogin...');
    Accounts.onLogin(onUser2LoggedInAfterReconnect);
    Meteor.disconnect();
    Meteor.reconnect();
  }

  function onUser2LoggedInAfterReconnect() {
    log('Logged in after reconnect as: ' + Meteor.user().username);
    log('Intentionally causing login failure...');
    Meteor.loginWithPassword('non-existent-user', 'or-wrong-password',
      onFailedLogin);
  }

  function onFailedLogin(err) {
    check(err, Meteor.Error); // We expected an error
    log('Login failed (as planned) but we are still correctly logged in as: ' + Meteor.user().username);
    log('Forcing reconnect should still cause us to relogin');
    Accounts.onLogin(onUser2LoggedInAfterReconnectAfterFailedLogin);
    Meteor.disconnect();
    Meteor.reconnect();
    timeoutHandle = Meteor.setTimeout(sayBugStillPresent, 1000);
  }

  function sayBugStillPresent() {
    log('BUG: Login on reconnect does NOT work after login failure!');
    Meteor.call('getConnectionUserId', showFinalState);
  }

  function onUser2LoggedInAfterReconnectAfterFailedLogin() {
    Meteor.clearTimeout(timeoutHandle);
    log('The bug is fixed. We were relogged in as:' + Meteor.user().username);
    Meteor.call('getConnectionUserId', showFinalState);
  }

  function showFinalState(err, connectionUserId) {
    check(err, undefined); // No error
    log('this.userId in server method: ' + connectionUserId);
    log('Meteor.userId() on client: ' + Meteor.userId());
    var user = Meteor.user();
    if (user) {
      log('Meteor.user().username on client: ' + user.username);
    } else {
      log('Meteor.user() on client: ' + user);
    }
  }
}
