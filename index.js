//used to connect to the database
const Firestore = require('@google-cloud/firestore');

//how we will access our database to store cookies
const cookieTableName = process.env.cookieTableName;
const cookieId = parseInt(process.env.cookieId);
const myProjectId = process.env.myProjectId;

//our firestore reference so we can authenticate connecting
const firestore = new Firestore({
	projectId: myProjectId
});

//used as web driver to browse the web
const puppeteer = require('puppeteer');

//used to parse rss feed
const Parser = require('rss-parser');
const parser = new Parser();

//login credentials
const username = process.env.username;
const password = process.env.password;

//browser we want to use while browsing
const useragent = process.env.useragent;
				   
//our desktop browser will have specific dimensions
const desktopWidth = parseInt(process.env.desktopWidth);
const desktopHeight = parseInt(process.env.desktopHeight);

//facebook page that contains login
const homepage = process.env.homepage;

//what is our account name? used to verify login
const accountName = 'Kevin';

//how long to wait for a page to load
const timeoutload = parseInt(process.env.timeoutload);

//how long do we wait
const waitShort = parseInt(process.env.waitShort);

//how long do we wait
const waitLong = parseInt(process.env.waitLong);

//if true, we will hide the browser gui
const headless = true;

//our tags to be included in our post
const tags = process.env.tags;

//we want to post the latest video post on youtube
const youtubeRssFeed = process.env.youtubeRssFeed;

//our browser reference object
var browser;

/**
Create our browser with the specified user agent and dimensions
*/
async function getBrowserPage() {
	
	//open our browser only once
	console.log('opening browser');
	if (!browser)
		browser = await puppeteer.launch({args: ['--no-sandbox'], headless: headless});
		
	//access the page we will be using to browse
	const page = await browser.newPage();
		
	//we need to set the user agent as well
	console.log('user agent: ' + useragent);
	await page.setUserAgent(useragent);
	
	//what is the size of the window we are simulating
	console.log('window size: w=' + desktopWidth + ', h=' + desktopHeight);
	await page.setViewport({ width: desktopWidth, height: desktopHeight })
	
	//return our page
	return page;
}

/**
Get the most recent video post from youtube and construct the text for our facebook post
*/
async function parseYoutubePost() {
	
	var postText = null;
	
	var posts = [];
	
	var feed = await parser.parseURL(youtubeRssFeed);
 
	//add to the array
	feed.items.forEach(item => {
		posts.push(item);
	});
	
	//sort the posts so the first is the most recent
	for (var i = 0; i < posts.length; i++) {
		
		for (var x = i + 1; x < posts.length; x++) {
			
			var item1 = posts[i];
			var item2 = posts[x];
			
			if (Date.parse(item2.pubDate) > Date.parse(item1.pubDate)) {	
				posts[i] = item2;
				posts[x] = item1;
			}
		}
	}
	
	//this is how our post will look like
	postText = posts[0].title + ' ' + tags + '\n\n' + posts[0].link;
	console.log('Parse text generated...');
	console.log(postText);
	return postText;
}

/**
Login to facebook
*/
async function login(page) {
	
	try {
				
		//go to the homepage
		console.log('opening home page');
		await page.goto(homepage, { timeout: timeoutload });
		await page.waitFor(waitShort);
		
		//entering user name
		console.log('entering username');
		await page.waitForSelector('#email');
		await page.type('#email', username);
		
		//entering password
		console.log('entering password');
		await page.type('#pass', password);

		//click login
		console.log('clicking login');
		
		//list of possible login buttons to click
		var loginButtons = ['#loginbutton','#u_0_8','#u_0_2'];
	
		for (var i = 0; i < loginButtons.length; i++) {
			
			try {
				
				await page.click(loginButtons[i]);
				await page.waitFor(waitShort);
				console.log('success - ' + loginButtons[i]);
				break;
			
			} catch (error) {
				
				//if this is the last login button one and still no success, we have a failure
				if (i == loginButtons.length - 1)
					throw new Error(error);
			}
		}
		
		//wait for the page to load after clicking login
		await page.waitForNavigation();
		
		//verify we are logged in
		var result = await verifyLogin(page);
		
		//if we aren't logged in, throw error
		if (!result) {
			
			//at this point we should have been logged in
			throw new Error('Couldn\'t verify login');
			
		} else {
			
			//get all cookies and save them for future use
			const cookies = await page.cookies();
			console.log(cookies);
			await saveCookies(JSON.stringify(cookies));
		}
		
		//return success
		return true;
		
	} catch (error) {
		
		//if we can't login don't continue
		throw new Error(error);
	}
	
	//if we made it to this point we have a failure
	return false;
}

/**
Post our text on facebook
*/
async function postOnFacebook(page, postText) {
	
	//click post area for focus
	console.log('clicking post area for focus');
	await page.waitFor(waitLong);
	
	//places where we can try to focus to enter post
	const focusArea = ['.clearfix._ikh'];//, '._4bl9'];
	
	for (var i = 0; i < focusArea.length; i++) {
		
		try {
			
			//wait till element is there
			await page.waitForSelector(focusArea[i]);
			await page.click(focusArea[i]);
			await page.waitFor(waitShort);
			
			console.log('success - ' + focusArea[i]);
			break;
		
		} catch (error) {
			
			//if this is the last one and still no success we have to error
			if (i == focusArea.length - 1)
				throw new Error(error);
		}
	}
	
	//entering post
	console.log('entering new post');
	await page.waitFor(waitLong);
	
	//possible places where we could paste our text
	const postTextArea = ['._1mf._1mj'];//,'._1mwp.navigationFocus._395._1mwq._4c_p._5bu_._3t-3._34nd._21mu._5yk1','._5yk2','._5rp7','._1p1t','._1p1v','._5rpb','.notranslate._5rpu'];

	for (var i = 0; i < postTextArea.length; i++) {
		
		try {
			
			await page.type(postTextArea[i], postText);
			await page.waitFor(waitShort);
			console.log('success - ' + postTextArea[i]);
			break;
		
		} catch (error) {
			
			//if this is the last one and still no success we have to error
			if (i == postTextArea.length - 1)
				throw new Error(error);
			
		}
	}
	
	//clicking share
	console.log('sharing post');
	
	//possible places to click "post"
	const postButton = ['._6c0o', '._1mf7._4r1q._4jy0._4jy3._4jy1._51sy.selected._42ft'];
	
	for (var i = 0; i < postButton.length; i++) {
		
		try {
			
			await page.click(postButton[i]);
			await page.waitFor(waitShort);
			console.log('success - ' + postButton[i]);
			break;
		
		} catch (error) {
			
			//if this is the last one and still no success we have to error
			if (i == postButton.length - 1)
				throw new Error(error);
		}
	}
}

async function verifyLogin(page) {
	
	try {
		
		console.log('verifying login');
		
		//opening home page
		await page.goto(homepage, { timeout: timeoutload });
		
		//look for account name tag
		console.log('checking for account name to ensure we are logged in');
		const accountNameTag = '._1vp5';
		await page.waitForSelector(accountNameTag);
		const element = await page.$(accountNameTag);
		const text = await (await element.getProperty('textContent')).jsonValue();
		
		//if account name is on the page we logged in successfully
		if (text == accountName) {
			console.log('we are logged in');
			return true;
		} else {
			console.log('Text not found for account name: "' + text + '"');
		}
		
	} catch (error) {
		console.log(error);
	}
	
	//we couldn't verify that we are logged in
	console.log('not logged in');
	return false;
}

//load our cookie information (if exists)
async function loadCookies(page) {
	
	//load file data if it exists
	console.log('loading cookies');
		
	//query the table and return the results in our snapshot
	var snapshot = await firestore.collection(cookieTableName).where('id', '==', cookieId).get();
	
	//make sure our objects are not null and has 1 result as expected
	if (snapshot != null && snapshot.docs != null && snapshot.docs.length == 1) {
		
		console.log('parsing cookies');
		
		//read text from db and parse to json array
		var tmpCookies = JSON.parse(snapshot.docs[0].data().cookieData);
		
		//inject each cookie into our browser page
		for (var i = 0; i < tmpCookies.length; i++) {
			console.log('injecting cookie - ' + tmpCookies[i].name);
			await page.setCookie(tmpCookies[i]);
		}
		
		//success
		return true;
		
	} else {
		console.log('cookies not found');
	}
	
	//we weren't successful loading cookies
	return false;
}

//here we will add / update the cookies
async function saveCookies(cookieData) {
	
	console.log('Saving cookies');
	
	try {
		
		//reference our cookie document
		const cookieRef = firestore.collection(cookieTableName);
		
		//query the table and return the results in our snapshot
		var snapshot = await cookieRef.where('id', '==', cookieId).get();
		
		if (snapshot.docs.length < 1) {
			
			//if there are no results we will add
			var result = await cookieRef.add({id: cookieId, cookieData: cookieData});
			console.log(result);
			console.log('Cookie(s) added to db');
			
		} else {
			
			//if cookies already exist we will update
			var result = await cookieRef.doc(snapshot.docs[0].id).update({cookieData: cookieData});
			console.log(result);
			console.log('Cookie(s) updated in db');
		}
		
		//return success
		return true;
		
	} catch (error) {
		
		console.log(error);
		
		//no success
		return false;
	}
}

async function runCustomAgent(res) {
	
	//get our page reference object
	const page = await getBrowserPage();
	
	//what are we going to post on facebook
	const postText = await parseYoutubePost();
	
	//were we successful loading cookies?
	var resultCookie = false;
	
	//were we successful verifying the login?
	var resultVerifyLogin = false;
	
	//load our cookies (if they exist)
	resultCookie = await loadCookies(page);
	
	//if we were able to load our cookies, check if we are logged in
	if (resultCookie)
		resultVerifyLogin = await verifyLogin(page);
	
	//if we were unablel to verify our login, go ahead and do it now
	if (!resultVerifyLogin) {
		
		//login to facebook
		await login(page);
	}
	
	//now post on facebook
	await postOnFacebook(page, postText);
	
	//close the browser
	await browser.close();
	
	//success
	console.log('Done');
	res.status(200).send('Done');
}

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.runAgent = (req, res) => {
    
	//obtain the keyId from the query string
	const keyId = req.query.keyId;

	//notify the key provided
	console.log("Key provided: " + keyId);

	//make sure correct key specified to invoke function
	if (keyId != null && keyId.length > 5 && keyId == process.env.keyId) {

		//print valid key id
		console.log("Key Id valid");

		//execute the process
		runCustomAgent(res);
		
	} else {

		//someone tried to access without a valid key
		console.log("Invalid key provided");
		res.status(200).send('Done');
	}
};
