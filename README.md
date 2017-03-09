# Purpose
The purspose of this library is to aim developers create applications for the PureProfile Business Platform.
The library provides:
* authentication / authorisation layer
* navigation through apps and accounts
* a generic search input which can be utilised by any application as it exports listeners

# Distribution / Installation
The library is available through npm, bower and cdn.

versions x.x.x-alpha.x are not stable and are used only for development. For production purposes please always use
"*" (for latest), x.x.x, >x.x.x, ^x.x.x etc semantic version.
For development, in order to always have the latest version (either alpha or stable) please use ">x.y.z-alpha" semantic version.
The npm repository is "puresdk".
If you are working with npm you just need to require / import the library into your code. If your're loading the library
in a <script> tag from CDN the library is exposed to window.PURESDK namespace.

# Features
## Initialise the library
First thing you should do is to initialise the library. This step is mandatory when useing the library.
In order to initialise the library use the "inti" function exposed by it.
### Commonjs version example:

<pre lang="javascript"><code>
let puresdk = require('puresdk');

puresdk.init({
    headerDivId: 'puresdk-container',
    appsVisible: true
});
</code></pre>

### CDN version expample:
<pre lang="javascript"><code>
window.PURESDK.init({
    headerDivId: 'puresdk-container',
    appsVisible: true
});
</code></pre>

As noticed, init method takes one argument of type object which holds the initial configuration you want to pass to it.
The supported params / keys of the configuration object are:
<table width="100%" cellspacing="0" cellpadding="0">
    <tr>
        <td><b>Key</b></td>
        <td><b>Description</b></td>
    </tr>
    <tr>
        <td>headerDivId (optional)</td>
        <td>The div id within which you want the header bar rendered by the library to seat in. If not defined the library
        creates a div of its own and automatically appends it in the beginning of your body tag</td>
    </tr>
    <tr>
        <td>appsVisible (optional, default=true)</td>
        <td>It referes to the applications icon of the top bar. If for any reason you don't want to have the applications
        menu on your app you can set the value of appsVisible to false. Default is true.</td>
    </tr>
</table>

## Authenticate / authorise the user
Second step (which is also absolutely mandatory) is to authenticate and authorise the current user. The library will automatically
check if the user is logged in and also if the logged in user has access to the application. The flow goes as follows:
### Commonjs version example:

<pre lang="javascript"><code>
let puresdk = require('puresdk');

puresdk.init({
    headerDivId: 'puresdk-container',
    appsVisible: true
});

// Promise version authentication
puresdk.authenticatePromise().then(/* here goes your code */);
</code></pre>

### CDN version expample:
<pre lang="javascript"><code>
window.PURESDK.init({
    headerDivId: 'puresdk-container',
    appsVisible: true
});

// Callback version authentication
window.PURESDK.authenticate(function(userInfo){
    // here goes your code
});
</code></pre>

Mention the two ways of authentication provided by the library. You can either use the authenticatePromise method which
returns a promise or the authenticate method which takes as parameter a success callback. Failure should not concern you as
in such case the library automtically redirects the user to the login page.

## getUserData
This function returns the full data of the user in an object.

## setInputPlaceholder
You can change the placeholder text of the search input on the middle of the bar by the use of this method. The method takes
just one argument (string).

## subscribeListener
In order to take control of the search bar you should subscribe listeners to its events. The available events of the search
input are "searchKeyUp", "searchEnter", "searchOnChage". In order to subscribe and start listening to any of those events
you should use the subscribeListener. The subscribeListener method returns back a function that when executed it unsubscribes
the subscribed handler.
### Example
<pre lang="javascript"><code>
let puresdk = require('puresdk');

/*
init & authentication process
*/

var unsubscribe = puresdk.subscribeListener('searchKeyUp', handlerFunction);
/* after subscribing the handlerFunction of yours to the searchKeyUp event on each key up on the input the
handlerFunction will get invoked passing the event as argument to it */

/* When you want to unsubscribe the handlerFunction from the searchKeyUp event you do: */
unsubscribe();
</code></pre>