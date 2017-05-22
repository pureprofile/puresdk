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
    <tr>
        <td>rootUrl (optional)</td>
        <td>For apps running on different domains you should set the root url explicitly.</td>
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

## Alert message boxes
The library provides a method for displaying message boxes on top of the page. The supported types are:
<ul>
    <li>info</li>
    <li>success</li>
    <li>warning</li>
    <li>error</li>
</ul>

In order to show a message box just use the "setInfo" method exposed by the sdk.
Here are a couple of examples:
<pre lang="javascript"><code>
/*
This code will pop up a success message box which will automatically hide itself in (the default) 5000 milliseconds
*/
puresdk.setInfo('success', 'Here goes your text');
</code></pre>

<pre lang="javascript"><code>
/*
This code will pop up a warning message box which will hide itself in 1000 millisecons (notice the third argument
passed into the method).
The third argument acts as options and it supports the "hideIn" key which can accept integers which represent the milliseconds
that we want the info box to stay visible before hiding itself.
*/
puresdk.setInfo('warning', 'Here goes your text', {hideIn:1000});
</code></pre>

<pre lang="javascript"><code>
/*
This code will pop up an error message that will not hide itself automatically. It can only get hidden by clicking on the
close button it provides on the right. This can be achieved by passing the value -1 to the hideIn key of the options.
*/
puresdk.setInfo('error', 'Here goes your text', {hideIn:-1});
</code></pre>

## Loader
A loader is included on the sdk's top bar. It's positioned right next to the apps button and can be shown and hidden at any
time. The methods that show/hide the loader are:
<ul>
    <li>showLoader()</li>
    <li>hideLoader()</li>
</ul>

## goToLoginPage
This method redirects the browser window to the login page. The method should be used in cases a 401 error code
comes back from the backend (meaning the user is not logged in).