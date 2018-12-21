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

//how long to wait for a page to load
const timeoutload = parseInt(process.env.timeoutload);

//how long do we wait
const waitShort = parseInt(process.env.waitShort);

//how long do we wait
const waitLong = parseInt(process.env.waitLong);

//if true, we will hide the browser gui
const headlessBrowser = true;

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
	
	console.log('opening browser');
	browser = await puppeteer.launch({args: ['--no-sandbox'], headless: headlessBrowser});
	const page = await browser.newPage();

	console.log('User agent: ' + useragent);
	await page.setUserAgent(useragent);
	
	console.log('browser width:' + desktopWidth + ', height:' + desktopHeight);
	await page.setViewport({ width: desktopWidth, height: desktopHeight })

	return page;
}

/**
Get the most recent video post from youtube and construct the text for our facebook post
*/
async function parseYoutubePost() {
	
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
	const postText = posts[0].title + ' ' + tags + '\n\n' + posts[0].link;
	console.log(postText);
	
	return postText;
}

/**
Login to facebook
*/
async function login() {
	
	const page = await getBrowserPage();
	
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
				
				//if this is the last one and still no success we have to error
				if (i == loginButtons.length - 1)
					throw new Error(error);
			}
		}
		
	} catch (error) {
		
		//if we can't login don't continue
		throw new Error(error);
	}
	
	return page;
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

async function runAgent(res) {
	
	//what are we going to post on facebook
	const postText = await parseYoutubePost();

	//login to facebook
	const page = await login();
	
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

	//what are we trying to update
	const target = req.query.target;

	//notify the key provided
	console.log("Key provided: " + keyId);

	//make sure correct key specified to invoke function
	if (keyId != null && keyId.length > 5 && keyId == process.env.keyId) {

		//print valid key id
		console.log("Key Id valid");

		//execute the process
		runAgent(res);
		
	} else {

		//someone tried to access without a valid key
		console.log("Invalid key provided");
		res.status(200).send('Done');
	}
};
