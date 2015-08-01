(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('Emoji', function () {

  /**
   * About base32 encoding of emojiis.
   *
   * For this to work the order and position of each emoji in the overall set of 
   * emojiis is important.
   * After placing all emojiis in a list we'll assign each one them the index id
   * of where it resides in the list.
   * 
   * To allow for the shortest possible notation of these indexes we'll use base32
   * encoding to store each of them, allowing for a 2 digit code to represent a 
   * 3 or 4 letter number.
   *
   * To go from and to base 32 we'll use javascript native Number.toString function
   * which accepts a radix which we set to 32.
   * To get back from base 32 we use the global parseInt function which also accepts
   * a radix argument which we set to 32
   *
   * (1000).toString(32) >> "v8"
   * parseInt('v8', 32) >> 1000
   */

  var groups = {
    faces: ['smile', 'laughing', 'blush', 'smiley', 'relaxed','smirk', 'heart_eyes', 'kissing_heart', 'kissing_closed_eyes', 'flushed','relieved', 'satisfied', 'grin', 'wink', 'stuck_out_tongue_winking_eye','stuck_out_tongue_closed_eyes', 'grinning', 'kissing', 'winky_face','kissing_smiling_eyes', 'stuck_out_tongue', 'sleeping', 'worried','frowning', 'anguished', 'open_mouth', 'grimacing', 'confused', 'hushed','expressionless', 'unamused', 'sweat_smile', 'sweat', 'wow','disappointed_relieved', 'weary', 'pensive', 'disappointed', 'confounded','fearful', 'cold_sweat', 'persevere', 'cry', 'sob', 'joy', 'astonished','scream', 'neckbeard', 'tired_face', 'angry', 'rage', 'triumph', 'sleepy','yum', 'mask', 'sunglasses', 'dizzy_face', 'imp', 'smiling_imp','neutral_face', 'no_mouth', 'innocent', 'alien', 'yellow_heart','blue_heart', 'purple_heart', 'heart', 'green_heart', 'broken_heart','heartbeat', 'heartpulse', 'two_hearts', 'revolving_hearts', 'cupid','sparkling_heart', 'sparkles', 'star', 'star2', 'dizzy', 'boom','collision', 'anger', 'exclamation', 'question', 'grey_exclamation','grey_question', 'zzz', 'dash', 'sweat_drops', 'notes', 'musical_note','fire', 'hankey', 'thumbsup', 'thumbsdown','ok_hand', 'punch', 'fist', 'v', 'wave', 'hand', 'raised_hand','open_hands', 'point_up', 'point_down', 'point_left', 'point_right','raised_hands', 'pray', 'point_up_2', 'clap', 'muscle', 'metal', 'fu','walking', 'runner', 'couple', 'family', 'two_men_holding_hands','two_women_holding_hands', 'dancer', 'dancers', 'ok_woman', 'no_good','information_desk_person', 'raising_hand', 'bride_with_veil','person_with_pouting_face', 'person_frowning', 'bow', 'couplekiss','couple_with_heart', 'massage', 'haircut', 'nail_care', 'boy', 'girl','woman', 'man', 'baby', 'older_woman', 'older_man','person_with_blond_hair', 'man_with_gua_pi_mao', 'man_with_turban','construction_worker', 'cop', 'angel', 'princess', 'smiley_cat','smile_cat', 'heart_eyes_cat', 'kissing_cat', 'smirk_cat', 'scream_cat','crying_cat_face', 'joy_cat', 'pouting_cat', 'japanese_ogre','japanese_goblin', 'see_no_evil', 'hear_no_evil', 'speak_no_evil','guardsman', 'skull', 'feet', 'lips', 'kiss', 'droplet', 'ear', 'eyes','nose', 'tongue', 'love_letter', 'bust_in_silhouette','busts_in_silhouette', 'speech_balloon', 'thought_balloon', 'trollface'],
    nature: ['sunny', 'umbrella', 'cloud','snowflake', 'snowman', 'zap', 'cyclone', 'foggy', 'ocean', 'cat', 'dog','mouse', 'hamster', 'rabbit', 'wolf', 'frog', 'tiger', 'koala', 'bear','pig', 'pig_nose', 'cow', 'boar', 'monkey_face', 'monkey', 'horse','racehorse', 'camel', 'sheep', 'elephant', 'panda_face', 'snake', 'bird','baby_chick', 'hatched_chick', 'hatching_chick', 'chicken', 'penguin','turtle', 'bug', 'honeybee', 'ant', 'beetle', 'snail', 'octopus','tropical_fish', 'fish', 'whale', 'whale2', 'dolphin', 'cow2', 'ram', 'rat','water_buffalo', 'tiger2', 'rabbit2', 'dragon', 'goat', 'rooster', 'dog2','pig2', 'mouse2', 'ox', 'dragon_face', 'blowfish', 'crocodile','dromedary_camel', 'leopard', 'cat2', 'poodle', 'paw_prints', 'bouquet','cherry_blossom', 'tulip', 'four_leaf_clover', 'rose', 'sunflower','hibiscus', 'maple_leaf', 'leaves', 'fallen_leaf', 'herb', 'mushroom','cactus', 'palm_tree', 'evergreen_tree', 'deciduous_tree', 'chestnut','seedling', 'blossom', 'ear_of_rice', 'shell', 'globe_with_meridians','sun_with_face', 'full_moon_with_face', 'new_moon_with_face', 'new_moon','waxing_crescent_moon', 'first_quarter_moon', 'waxing_gibbous_moon','full_moon', 'waning_gibbous_moon', 'last_quarter_moon','waning_crescent_moon', 'last_quarter_moon_with_face','first_quarter_moon_with_face', 'moon', 'earth_africa', 'earth_americas','earth_asia', 'volcano', 'milky_way', 'partly_sunny'],
    life: ['bamboo', 'gift_heart', 'dolls', 'school_satchel', 'mortar_board', 'flags','fireworks', 'sparkler', 'wind_chime', 'rice_scene', 'jack_o_lantern','ghost', 'santa', 'christmas_tree', 'gift', 'bell', 'no_bell','tanabata_tree', 'tada', 'confetti_ball', 'balloon', 'crystal_ball', 'cd','dvd', 'floppy_disk', 'camera', 'video_camera', 'movie_camera', 'computer','tv', 'iphone', 'phone', 'telephone', 'telephone_receiver', 'pager', 'fax','minidisc', 'vhs', 'sound', 'speaker', 'mute', 'loudspeaker', 'mega','hourglass', 'hourglass_flowing_sand', 'alarm_clock', 'watch', 'radio','satellite', 'loop', 'mag', 'mag_right', 'unlock', 'lock','lock_with_ink_pen', 'closed_lock_with_key', 'key', 'bulb', 'flashlight','high_brightness', 'low_brightness', 'electric_plug', 'battery', 'calling','email', 'mailbox', 'postbox', 'bath', 'bathtub', 'shower', 'toilet','wrench', 'nut_and_bolt', 'hammer', 'seat', 'moneybag', 'yen', 'dollar','pound', 'euro', 'credit_card', 'money_with_wings', 'e-mail', 'inbox_tray','outbox_tray', 'envelope', 'incoming_envelope', 'postal_horn','mailbox_closed', 'mailbox_with_mail', 'mailbox_with_no_mail', 'door','smoking', 'bomb', 'gun', 'hocho', 'pill', 'syringe', 'page_facing_up','page_with_curl', 'bookmark_tabs', 'bar_chart', 'chart_with_upwards_trend','chart_with_downwards_trend', 'scroll', 'clipboard', 'calendar', 'date','card_index', 'file_folder', 'open_file_folder', 'scissors', 'pushpin','paperclip', 'black_nib', 'pencil2', 'straight_ruler', 'triangular_ruler','closed_book', 'green_book', 'blue_book', 'orange_book', 'notebook','notebook_with_decorative_cover', 'ledger', 'books', 'bookmark','name_badge', 'microscope', 'telescope', 'newspaper', 'football','basketball', 'soccer', 'baseball', 'tennis', '8ball', 'rugby_football','bowling', 'golf', 'mountain_bicyclist', 'bicyclist', 'horse_racing','snowboarder', 'swimmer', 'surfer', 'ski', 'spades', 'hearts', 'clubs','diamonds', 'gem', 'ring', 'trophy', 'musical_score', 'musical_keyboard','violin', 'space_invader', 'video_game', 'black_joker','flower_playing_cards', 'game_die', 'dart', 'mahjong', 'clapper', 'memo','book', 'art', 'microphone', 'headphones', 'trumpet', 'saxophone','guitar', 'shoe', 'sandal', 'high_heel', 'lipstick', 'boot', 'shirt','necktie', 'womans_clothes', 'dress', 'running_shirt_with_sash','jeans', 'kimono', 'bikini', 'ribbon', 'tophat', 'crown', 'womans_hat','mans_shoe', 'closed_umbrella', 'briefcase', 'handbag', 'pouch', 'purse','eyeglasses', 'fishing_pole_and_fish', 'coffee', 'tea', 'sake','baby_bottle', 'beer', 'beers', 'cocktail', 'tropical_drink', 'wine_glass','fork_and_knife', 'pizza', 'hamburger', 'fries', 'poultry_leg','meat_on_bone', 'spaghetti', 'curry', 'fried_shrimp', 'bento', 'sushi','fish_cake', 'rice_ball', 'rice_cracker', 'rice', 'ramen', 'stew', 'oden','dango', 'egg', 'bread', 'doughnut', 'custard', 'icecream', 'ice_cream','shaved_ice', 'birthday', 'cake', 'cookie', 'chocolate_bar', 'candy','lollipop', 'honey_pot', 'apple', 'green_apple', 'tangerine', 'lemon','cherries', 'grapes', 'watermelon', 'strawberry', 'peach', 'melon','banana', 'pear', 'pineapple', 'sweet_potato', 'eggplant', 'tomato', 'corn'],
    travel: ['house', 'house_with_garden', 'school', 'office', 'post_office', 'hospital','bank', 'convenience_store', 'love_hotel', 'hotel', 'wedding', 'church','department_store', 'european_post_office', 'city_sunrise', 'city_sunset','japanese_castle', 'european_castle', 'tent', 'factory', 'tokyo_tower','japan', 'mount_fuji', 'sunrise_over_mountains', 'sunrise', 'stars','statue_of_liberty', 'bridge_at_night', 'carousel_horse', 'rainbow','ferris_wheel', 'fountain', 'roller_coaster', 'ship', 'speedboat', 'boat','rowboat', 'anchor', 'rocket', 'airplane', 'helicopter','steam_locomotive', 'tram', 'mountain_railway', 'bike', 'aerial_tramway','suspension_railway', 'mountain_cableway', 'tractor', 'blue_car','oncoming_automobile', 'car', 'taxi', 'oncoming_taxi','articulated_lorry', 'bus', 'oncoming_bus', 'rotating_light', 'police_car','oncoming_police_car', 'fire_engine', 'ambulance', 'minibus', 'truck','train', 'station', 'bullettrain_front', 'bullettrain_side','light_rail', 'monorail', 'railway_car', 'trolleybus', 'ticket', 'fuelpump','vertical_traffic_light', 'traffic_light', 'warning', 'construction','beginner', 'atm', 'slot_machine', 'busstop', 'barber', 'hotsprings','checkered_flag', 'crossed_flags', 'izakaya_lantern', 'moyai','circus_tent', 'performing_arts', 'round_pushpin','triangular_flag_on_post', 'jp', 'kr', 'cn', 'us', 'fr', 'es', 'it', 'ru', 'uk', 'de'],
    signs: ['one', 'two', 'three', 'four', 'five', 'six', 'seven','eight', 'nine', 'keycap_ten', '1234', 'zero', 'hash', 'symbols','arrow_backward', 'arrow_down', 'arrow_forward', 'arrow_left','capital_abcd', 'abcd', 'abc', 'arrow_lower_left', 'arrow_lower_right','arrow_right', 'arrow_up', 'arrow_upper_left', 'arrow_upper_right','arrow_double_down', 'arrow_double_up', 'arrow_down_small','arrow_heading_down', 'arrow_heading_up', 'leftwards_arrow_with_hook','arrow_right_hook', 'left_right_arrow', 'arrow_up_down', 'arrow_up_small','arrows_clockwise', 'arrows_counterclockwise', 'rewind', 'fast_forward','information_source', 'ok', 'twisted_rightwards_arrows', 'repeat','repeat_one', 'new', 'top', 'up', 'cool', 'free', 'ng', 'cinema', 'koko','signal_strength', 'u5272', 'u5408', 'u55b6', 'u6307', 'u6708', 'u6709','u6e80', 'u7121', 'u7533', 'u7a7a', 'u7981', 'sa', 'restroom', 'mens','womens', 'baby_symbol', 'no_smoking', 'parking', 'wheelchair', 'metro','baggage_claim', 'accept', 'wc', 'potable_water', 'put_litter_in_its_place','secret', 'congratulations', 'm', 'passport_control', 'left_luggage','customs', 'ideograph_advantage', 'cl', 'sos', 'id', 'no_entry_sign','underage', 'no_mobile_phones', 'do_not_litter', 'non-potable_water','no_bicycles', 'no_pedestrians', 'children_crossing', 'no_entry','eight_spoked_asterisk', 'eight_pointed_black_star', 'heart_decoration','vs', 'vibration_mode', 'mobile_phone_off', 'chart', 'currency_exchange','aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpius','sagittarius', 'capricorn', 'aquarius', 'pisces', 'ophiuchus','six_pointed_star', 'negative_squared_cross_mark', 'a', 'b', 'ab', 'o2','diamond_shape_with_a_dot_inside', 'recycle', 'end', 'on', 'soon', 'clock1','clock130', 'clock10', 'clock1030', 'clock11', 'clock1130', 'clock12','clock1230', 'clock2', 'clock230', 'clock3', 'clock330', 'clock4','clock430', 'clock5', 'clock530', 'clock6', 'clock630', 'clock7','clock730', 'clock8', 'clock830', 'clock9', 'clock930', 'heavy_dollar_sign','copyright', 'registered', 'tm', 'x', 'heavy_exclamation_mark', 'bangbang','interrobang', 'o', 'heavy_multiplication_x', 'heavy_plus_sign','heavy_minus_sign', 'heavy_division_sign', 'white_flower', '100','heavy_check_mark', 'ballot_box_with_check', 'radio_button', 'link','curly_loop', 'wavy_dash', 'part_alternation_mark', 'trident','black_square', 'white_square', 'white_check_mark', 'black_square_button','white_square_button', 'black_circle', 'white_circle', 'red_circle','large_blue_circle', 'large_blue_diamond', 'large_orange_diamond','small_blue_diamond', 'small_orange_diamond', 'small_red_triangle','small_red_triangle_down']
  };

  var all = groups.faces.concat(groups.nature, groups.life, groups.travel, groups.signs);
  var base32 = [], from_base32 = {}, to_base32 = {}, b;
  for (var i=0; i<all.length; i++) {
    b = (i).toString(32);
    base32.push(b);
    to_base32[all[i]] = b;
    from_base32[b] = all[i];
  }

  var regexp = new RegExp(":(" + all.join("|") + "|" + base32.join("|") + "):", "g");
  var extras = {
     /* :-)  */ smile: /:-?\)/g,
     /* :o   */ open_mouth: /:o/gi,
     /* :-o  */ scream: /:-o/gi,
     /* :-]  */ smirk: /[:;]-?]/g,
     /* :-D  */ grinning: /[:;]-?d/gi,
     /* X-D  */ stuck_out_tongue_closed_eyes: /x-d/gi,
     /* ;-p  */ stuck_out_tongue_winking_eye: /[:;]-?p/gi,
     /* :-[ / :-@  */ rage: /:-?[\[@]/g,
     /* :-(  */ frowning: /:-?\(/g,
     /* :'-( */ sob: /:['’]-?\(|:&#x27;\(/g,
     /* :-*  */ kissing_heart: /:-?\*/g,
     /* ;-)  */ wink: /;-?\)/g,
     /* :-/  */ pensive: /:-\//g, /* used to be /:-?\//g but this gave problems with all urls like http:// */
     /* :-s  */ confounded: /:-?s/gi,
     /* :-|  */ flushed: /:-?\|/g,
     /* :-$  */ relaxed: /:-?\$/g,
     /* :-x  */ mask: /:-x/gi,
     /* <3   */ heart: /<3|&lt;3/g,
     /* </3  */ broken_heart: /<\/3|&lt;&#x2F;3/g,
  };

  var SERVICE = {
    groups: groups,
    emojifi: function (str) {
      var result = (str||'').replace(regexp, function (match, text) {
        if (from_base32[text]) { text = from_base32[text] }
        else if (to_base32[text]) { text = text }
        else { return match }
        return '<i class="emoji emoji-' + text + '"></i>';
      });
      var name, names = Object.getOwnPropertyNames(extras);
      for (var i=0; i<names.length; i++) {
        name = names[i];
        result = result.replace(extras[name], function (match, text) {
          return '<i class="emoji emoji-' + name + '"></i>';
        });
      }
      var lines = result.split(/\r?\n/);
      return '<span>' + lines.join('</span><br><span>') + '</span>';
    },
    toBase32: function (id) {
      return to_base32[id] || id;
    }
  };

  return SERVICE;
});
})();