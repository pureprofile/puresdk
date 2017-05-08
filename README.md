# Purpose
The purpose of this library is to aim developers create applications for the PureProfile Business Platform.
The library provides:
* authentication / authorization layer
* navigation through apps and accounts
* a generic search input which can be utilized by any application as it exports listeners

# Distribution / Installation
The library is available through npm, bower and cdn.

versions x.x.x-alpha.x are not stable and are used only for development. For production purposes please always use
"*" (for latest), x.x.x, >x.x.x, ^x.x.x etc semantic version.
For development, in order to always have the latest version (either alpha or stable) please use ">x.y.z-alpha" semantic version.
The npm repository is "puresdk".
If you are working with npm you just need to require / import the library into your code. If you're loading the library
in a script tag from CDN the library is exposed to window.PURESDK namespace.

# Features
## Initialize the library
First thing you should do is to initialize the library. This step is mandatory when using the library.
In order to initialize the library use the "init" function exposed by it.

### Commonjs version example:
<pre lang="javascript"><code>
let puresdk = require('puresdk');

puresdk.init({
    headerDivId: 'puresdk-container',
    appsVisible: true,
    development: false
});
</code></pre>

### CDN version example:
<pre lang="javascript"><code>
window.PURESDK.init({
    headerDivId: 'puresdk-container',
    appsVisible: true,
    development: false
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
    <tr>
        <td>development (optional, default=false)</td>
        <td>When development is enabled it overrides the default call urls to call PureProfile's dev-servers instead of the current domain.</td>
    </tr>
</table>

## Authenticate / authorize the user
Second step (which is also absolutely mandatory) is to authenticate and authorize the current user. The library will automatically
check if the user is logged in and also if the logged in user has access to the application. The flow goes as follows:

### Commonjs version example:
<pre lang="javascript"><code>
let puresdk = require('puresdk');

puresdk.init({
    headerDivId: 'puresdk-container',
    appsVisible: true,
    development: false
});

// Promise version authentication
puresdk.authenticatePromise().then(/* here goes your code */);
</code></pre>

### CDN version example:
<pre lang="javascript"><code>
window.PURESDK.init({
    headerDivId: 'puresdk-container',
    appsVisible: true,
    development: false
});

// Callback version authentication
window.PURESDK.authenticate(function(userInfo){
    // here goes your code
});
</code></pre>

Mention the two ways of authentication provided by the library. You can either use the authenticatePromise method which
returns a promise or the authenticate method which takes as parameter a success callback. Failure should not concern you as
in such case the library automatically redirects the user to the login page.

## getUserData
This function returns the full data of the user in an object.
