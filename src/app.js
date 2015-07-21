/**
 * Curatescape Pebble
 * Built for Omeka sites using the Curatescape framework
 * Created by Erin Bell for Center for Public History + Digital Humanities, Cleveland State University  
 */

var UI = require('ui');
var Vector2 = require('vector2');
var ajax = require('ajax');
var geolib = require('geolib');

var project_title="Cleveland Historical";
var project_about="Cleveland Historical is a website and mobile app that puts Cleveland history at your fingertips. Developed by the Center for Public History + Digital Humanities at Cleveland State University, Cleveland Historical lets you explore the people, places, and moments that have shaped the city's history. Learn about the region through layered, map-based, multimedia presentations, use social media to share your stories, and experience curated historical tours of Northeast Ohio.";
var web_root = 'http://clevelandhistorical.org/';

/* Helpers */
function stripslashes(string) {
  return string.replace(/\\/g, '');
}
function strip_tags(string) {
  var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  return string.replace(tags, '');
}
function strTruncate(string, width) { 
    string = string.replace(/[\s\r\n]+/, ' ');
    if (string.length >= width) {
        var result = string[width - 1] === ' ' ? string.substr(0, width - 1) : string.substr(0, string.substr(0, width).lastIndexOf(' '));
        if (result.length === 0)
          result = string.substr(0, width - 1);
        return result;
    }
    return string;  
}
function strTruncateWhole(string, width) { 
  var arr = [];
  console.log(string);
  if(string.length>0){
    string = string.replace(/[\s\r\n]+/, ' ');
    var b = 0;
      while(b < string.length) {
        arr.push(strTruncate(string.substring(b), width));
        b += arr[arr.length-1].length;
      }  
    }
    console.log(arr);
    return arr;
}
function calculateUITextHeight(fontSize, charsPerLine, string){
  var lines = strTruncateWhole(string,charsPerLine);                   
  var height=lines.length*fontSize;  
  return height > 0 ? height : 20;
}

/* Launch */
var loading = new UI.Window();
var image = new UI.Image({
	position: new Vector2(0, 0),
	size: new Vector2(144, 168),
	image: 'images/loading.png', // 144 x 168px
	backgroundColor: 'white'
});
loading.fullscreen(true);
loading.backgroundColor('white');
loading.add(image);
loading.show();
console.log('Launching...');

/* Determine location capabilities on startup */
function initMenu() {
  console.log('Requesting location information...');
  navigator.geolocation.getCurrentPosition(
    locationSuccess,
    locationError,
    {timeout: 15000, maximumAge: 60000}
  );
}

/* Location callbacks */
var currentLocation;
function locationSuccess(pos) {
  //currentLocation = {lat:41.501513,lon:-81.67418700000002}; // <== for testing
  currentLocation = {lat:pos.coords.latitude,lon:pos.coords.longitude};
  console.log('Current user location: '+currentLocation.lat+', '+currentLocation.lon);
  Pebble.GlobalVar = currentLocation;
  mainMenu(true);
}

function locationError(err) {
  console.log('Error requesting user location! Continuing without it...');
  mainMenu(false);
}

/* Main Menu */
function mainMenu(hasLocation){
  console.log('Loading interface...');
  var menu_items = [];
  ajax({
    url: web_root + 'items?output=mobile-json&per_page=999',
    type: 'json'
  }, function(data) {
    data.items.forEach(function(item, i) {
      var address = item.address.length > 1 ? item.address : 'No Address Available';
      var title = String(item.title).replace(/&#039;/g, "'").replace(/&quot;/g, '"');
      var m = {};
      m.title = title;
      m.subtitle = address;
      m.api_id = item.id;
      m.latitude=item.latitude;
      m.longitude=item.longitude;
      menu_items.push(m);
      i++;
    });
    
    if(hasLocation===true){
      //sort menu_items by proximity and add distance to array
      menu_items.forEach(function(m){
        var distance = geolib.getDistance(
            {latitude:currentLocation.lat, longitude:currentLocation.lon}, 
            {latitude:m.latitude,longitude:m.longitude},10);
        m.distance=distance; // meters
        m.subtitle= geolib.convertUnit('mi',distance,2)+' mi'; // miles
      });
      menu_items.sort(function(a, b){
         return a.distance-b.distance;
      });
    }
    
    var main = new UI.Menu({
      backgroundColor: 'white',
      textColor: 'black',
      highlightBackgroundColor: 'vividCerulean',
      highlightTextColor: 'white',
      sections: [{
        title: 'Cleveland Historical',
        items: [{
          title:'Stories',
          subtitle: hasLocation ? 'Near current location' : 'Most recent'
        },{
          title:'About',
          subtitle:'Cleveland Historical'
        }]
      }]
    });
  
    /* ...Loaded */
    loading.hide();
    main.show();
    console.log('Main menu loaded!');
    
    main.on('select', function(e) {
        console.log('Button press');
      
        if(e.itemIndex===0){ 
          
          /* Stories Menu */
          var stories = new UI.Menu({
            backgroundColor: 'white',
            textColor: 'black',
            highlightBackgroundColor: 'vividCerulean',
            highlightTextColor: 'white',
            sections: [{
              title: hasLocation ? 'Nearby Stories' : 'Recent Stories',
              items: menu_items
            }]
          });    
          stories.show();
          console.log('Stories menu loaded!');
          
          stories.on('select', function(e) {
            /* Story selected */
            console.log('Creating card for item with API ID ' + e.item.api_id + '...');
            
            var distance = e.item.subtitle;
            var item_id=e.item.api_id;
            
            ajax({
              url: web_root + 'items/show/' + e.item.api_id + '?output=mobile-json',
              type: 'json'
            }, function(data) {
              console.log('Fetching data for item...');
              
              /* Story */
              var window = new UI.Window();
              window.backgroundColor('white');
              window.scrollable('true');
              
              // title
              var title = data.title.replace(/&#039;/g, "'").replace(/&quot;/g, '"');
              var title_height = calculateUITextHeight(24, 18, title);
              var title_container_height = title_height + 18;
              var titleBG = new UI.Rect({
                position: new Vector2(0, 0),
                size: new Vector2(144, title_container_height),
                backgroundColor: 'black'
              });
              var titleText = new UI.Text({
                position: new Vector2(2, 4),
                size: new Vector2(140, title_height),
                text: title,
                font: 'gothic-24-bold',
                color: 'white',
                textAlign: 'center',
                textOverflow: 'ellipsis',
                backgroundColor: 'black'
              });
              window.add(titleBG);
              window.add(titleText);  
              
              // start tracking y position after title height is set
              var y_pos=title_container_height; // y_pos always equals bottom of previous element
              
              // distance
              var distance_height = 25;
              var distanceText = new UI.Text({
                position: new Vector2(0, y_pos),
                size: new Vector2(144, distance_height),
                text: distance,
                font: 'gothic-18-bold',
                color: 'white',
                backgroundColor: 'vividCerulean',
                textAlign: 'center',
                textOverflow: 'ellipsis'
              });
              y_pos=y_pos+distance_height;
              window.add(distanceText);

              
              // factoid
              if (data.factoid.length > 1) {
                console.log('Adding factoid...');
                
                var factoid= strip_tags(data.factoid);
                var factoid_height = calculateUITextHeight(18, 20, factoid);
                y_pos = y_pos + 2;
                var factoidText = new UI.Text({
                  position: new Vector2(4, y_pos),
                  size: new Vector2(136, factoid_height),
                  text: factoid,
                  font: 'gothic-18',
                  color: 'black',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  textOverflow: 'wrap'
                });
              y_pos=y_pos+factoid_height;  
              window.add(factoidText);
              }
              
              // address
              if (data.address.length > 1) {
                console.log('Adding address...');
                
                // address header
                var address_header_height = 25;
                var address_headerText = new UI.Text({
                  position: new Vector2(0, y_pos),
                  size: new Vector2(144, address_header_height),
                  text: 'Address',
                  font: 'gothic-18-bold',
                  color: 'white',
                  backgroundColor: 'cobaltBlue',
                  textAlign: 'center',
                  textOverflow: 'ellipsis'
                });
                y_pos=y_pos+address_header_height;
                window.add(address_headerText);     
                
                // address text
                var address= strip_tags(data.address);
                var address_height = calculateUITextHeight(18, 20, address);
                y_pos = y_pos + 2;
                var addressText = new UI.Text({
                  position: new Vector2(4, y_pos),
                  size: new Vector2(136, address_height),
                  text: address,
                  font: 'gothic-18',
                  color: 'black',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  textOverflow: 'wrap'
                });
                y_pos=y_pos+address_height;  
                window.add(addressText);
              }    

              
              // access info
              if (data.accessinfo.length > 1) {
                console.log('Adding access info...');
                
                // access info header
                var access_header_height = 25;
                var access_headerText = new UI.Text({
                  position: new Vector2(0, y_pos),
                  size: new Vector2(144, access_header_height),
                  text: 'Access Info',
                  font: 'gothic-18-bold',
                  color: 'white',
                  backgroundColor: 'cobaltBlue',
                  textAlign: 'center',
                  textOverflow: 'ellipsis'
                });
                y_pos=y_pos+access_header_height;
                window.add(access_headerText);     
                
                // access info text
                var access= strip_tags(data.accessinfo);
                var access_height = calculateUITextHeight(18, 20, access);
                y_pos = y_pos + 2;
                var accessText = new UI.Text({
                  position: new Vector2(4, y_pos),
                  size: new Vector2(136, access_height),
                  text: access,
                  font: 'gothic-18',
                  color: 'black',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  textOverflow: 'wrap'
                });
                y_pos=y_pos+access_height;  
                window.add(accessText);
               }               
              
              // website
              if (data.website.length > 1) {
                console.log('Adding website...');
                
                // website header
                var website_header_height = 25;
                var website_headerText = new UI.Text({
                  position: new Vector2(0, y_pos),
                  size: new Vector2(144, website_header_height),
                  text: 'Official Website',
                  font: 'gothic-18-bold',
                  color: 'white',
                  backgroundColor: 'cobaltBlue',
                  textAlign: 'center',
                  textOverflow: 'ellipsis'
                });
                y_pos=y_pos+website_header_height;
                window.add(website_headerText);     
                
                // website text
                var website=data.website;
                var website_string=stripslashes(website);
                website_string= strip_tags(website);
                var website_height = calculateUITextHeight(18, 20, website_string);
                y_pos = y_pos + 2;
                var websiteText = new UI.Text({
                  position: new Vector2(4, y_pos),
                  size: new Vector2(136, website_height),
                  text:  website_string,
                  font: 'gothic-18',
                  color: 'black',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  textOverflow: 'wrap'
                });
                y_pos=y_pos+website_height;  
                window.add(websiteText);
               }

              
              // story excerpt
              if (data.description.length > 1) {
                console.log('Adding description...');
                
                // story header
                var description_header_height = 25;
                var description_headerText = new UI.Text({
                  position: new Vector2(0, y_pos),
                  size: new Vector2(144, description_header_height),
                  text: 'Story Excerpt',
                  font: 'gothic-18-bold',
                  color: 'white',
                  backgroundColor: 'orange',
                  textAlign: 'center',
                  textOverflow: 'ellipsis'
                });
                y_pos=y_pos+description_header_height;
                window.add(description_headerText);     
                
                // story text
                var description= strip_tags(stripslashes(data.description)).replace(/&#039;/g, "'").replace(/&quot;/g, '"');
                description=description.substring(0,description.indexOf('\n'))+'...';// trim to 1 paragraph
                var description_height=calculateUITextHeight(18, 24, description); 
                console.log(description_height);
                y_pos = y_pos + 2;
                var descriptionText = new UI.Text({
                  position: new Vector2(4, y_pos),
                  size: new Vector2(136, description_height),
                  text: description,
                  font: 'gothic-18',
                  color: 'black',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  textOverflow: 'ellipsis'
                });
                y_pos=y_pos+description_height+20;  
                window.add(descriptionText);

                // story footer
                var description_footer_height = 90;
                var footer_text='\nContinue reading at:\n'+web_root.replace(/^(https?):\/\//g,'')+'\n'+'items/show/'+item_id+'';
                var description_footerText = new UI.Text({
                  position: new Vector2(0, y_pos),
                  size: new Vector2(144, description_footer_height),
                  text: footer_text,
                  font: 'gothic-18',
                  color: 'white',
                  backgroundColor: 'orange',
                  textAlign: 'center',
                  textOverflow: 'wrap'
                });
                y_pos=y_pos+description_footer_height;
                window.add(description_footerText);  
                
              }
              
              window.show();  
              console.log('The story is loaded!');
              
            },function(error, status, request){
              /* Story error */
              console.log('The ajax request failed: ' + error);
              var err = new UI.Window({
                fullscreen: true,
                backgroundColor: 'vividCerulean',
              });
              var textfield = new UI.Text({
                position: new Vector2(0, 65),
                size: new Vector2(144, 30),
                font: 'gothic-24-bold',
                text: 'Unable to fetch data!',
                textAlign: 'center',
              });
              err.add(textfield);
              err.show();              
            });
            
            });
          
        }
  
        if(e.itemIndex===1){ 
         
          /* About */
          var window = new UI.Window();
          window.backgroundColor('white');
          window.scrollable('true');
          var title = project_title;
          var title_height = calculateUITextHeight(24, 18, title);
          var title_container_height = title_height + 18;
          var titleBG = new UI.Rect({
            position: new Vector2(0, 0),
            size: new Vector2(144, title_container_height),
            backgroundColor: 'black'
          });
          var titleText = new UI.Text({
            position: new Vector2(2, 4),
            size: new Vector2(140, title_height),
            text: title,
            font: 'gothic-24-bold',
            color: 'white',
            textAlign: 'center',
            textOverflow: 'ellipsis',
            backgroundColor: 'black'
          });
          var subtitle_pos = title_container_height;
          var subtitle_height = 25;
          var subtitleText = new UI.Text({
            position: new Vector2(0, subtitle_pos),
            size: new Vector2(144, subtitle_height),
            text: "About",
            font: 'gothic-18-bold',
            color: 'white',
            backgroundColor: 'vividCerulean',
            textAlign: 'center',
            textOverflow: 'ellipsis'
          });
          var body=project_about;
          var body_height = calculateUITextHeight(18, 24, body);
          var body_pos = subtitle_pos + subtitle_height + 2;
          var bodyText = new UI.Text({
            position: new Vector2(4, body_pos),
            size: new Vector2(136, body_height),
            text: body,
            font: 'gothic-18',
            color: 'black',
            backgroundColor: 'white',
            textAlign: 'left',
            textOverflow: 'wrap'
          });
          window.add(titleBG);
          window.add(titleText);
          window.add(subtitleText);
          window.add(bodyText);
          window.show();
        }
      
    });
  },function(error, status, request) {
      console.log('The ajax request failed: ' + error);
      var err = new UI.Window({
        fullscreen: true,
        backgroundColor: 'vividCerulean',
      });
      var textfield = new UI.Text({
        position: new Vector2(0, 65),
        size: new Vector2(144, 30),
        font: 'gothic-24-bold',
        text: 'Unable to fetch data!',
        textAlign: 'center',
      });
      err.add(textfield);
      err.show();  
  });  
}

/* Get user location and load the main menu */
initMenu(); 
