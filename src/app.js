/**
 * Cleveland Historical
 * Built for Omeka sites using the Curatescape framework
 * Created by Erin Bell for Center for Public History + Digital Humanities, Cleveland State University  
 */

var UI = require('ui');
var Vector2 = require('vector2');
var ajax = require('ajax');
var geolib = require('geolib');

var web_root = 'http://clevelandhistorical.org/';

/* Helpers */
function strip_tags(input, allowed) {
	allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); 
	var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
		commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
	return input.replace(commentsAndPhpTags, '').replace(tags, function($0, $1) {
		return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
	});
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
  currentLocation = {lat:pos.coords.latitude,lon:pos.coords.longitude};
  console.log('Current location: '+currentLocation.lat+', '+currentLocation.lon);
  Pebble.GlobalVar = currentLocation;
  mainMenu(true);
}

function locationError(err) {
  console.log('Error requesting location! Continuing without it...');
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
      //sort menu_items by proximity
      menu_items.forEach(function(m){
        var distance = geolib.getDistance({
            latitude:currentLocation.lat, longitude:currentLocation.lon}, 
            {latitude:m.latitude,longitude:m.longitude},
            10);
        m.distance=distance; // meters
        m.subtitle= geolib.convertUnit('mi',distance,2)+' mi'; // miles
      });
      menu_items.sort(function(a, b){
         return a.distance-b.distance;
      });
    }
    
    var main = new UI.Menu({
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
        
        if(e.itemIndex===0){ 
          /* Stories Menu */
          var stories = new UI.Menu({
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
            var card = new UI.Card();
            card.style('small');
            card.scrollable('true');
            ajax({
              url: web_root + 'items/show/' + e.item.api_id + '?output=mobile-json',
              type: 'json'
            }, function(data) {
              var title = data.title.replace(/&#039;/g, "'").replace(/&quot;/g, '"');
              var t = '';
              if (data.factoid.length > 1) {
                t += strip_tags(data.factoid) + '\n\n';
              }
              if (data.address.length > 1) {
                t += 'Address:\n' + strip_tags(data.address) + '\n\n';
              }
              if (data.accessinfo.length > 1) {
                t += 'Access Info:\n' + strip_tags(data.accessinfo) + '\n\n';
              }
              if (data.website.length > 1) {
                t += 'Official Website:\n' + strip_tags(data.website) + '\n\n';
              }
              t += 'Read more about ' + title + ' at:\n' + web_root.replace('http://', '') + 'items/show/' + e.item.api_id + '\n\n';
              card.title(strip_tags(title));
              if (data.subtitle.length > 1) {
                var subtitle=data.subtitle.replace(/&#039;/g, "'").replace(/&quot;/g, '"');
                card.subtitle(strip_tags(subtitle));
              }
              card.body(t).backgroundColor('white');
              card.show();
              console.log('The card is loaded!');
              
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
          var about = new UI.Card();
          about.scrollable('true');
          about.style('small');
          about.title('About');
          about.subtitle('Cleveland Historical');
          about.body('Developed by the Center for Public History + Digital Humanities at the '+
                     'Cleveland State University Department of History, Cleveland Historical lets you explore the people, '+
                     'places, and moments that have shaped the city\'s history. Learn more at clevelandhistorical.org.')
                      .backgroundColor('white');
          about.show();        
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

/* Get user location and load the interface */
initMenu(); 
