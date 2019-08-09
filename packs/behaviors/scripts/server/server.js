var serverSystem = server.registerSystem(0, 0);
/**
 * List of cooldowns for all players when using the explosive pick
 */
var cooldowns = {}
/**
 * This keeps track of all players that are breaking a block at the moment.
 */
var breakingBlocks = {};

// Setup which events to listen to
serverSystem.initialize = function () {
    // set up your listenToEvents and register server-side components here.
    //serverSystem.listenForEvent("explodingpickaxeaddon:pinky", receivePinkyMessage);
    this.listenForEvent("minecraft:block_destruction_started", (eventData) => this.onPlayerBreakingBlock(eventData));
    this.listenForEvent("minecraft:block_destruction_stopped", (eventData) => this.onPlayerStoppedBreakingBlock(eventData));
}

/**
 * Cooldown after using the explosive pickaxe in ticks
 */
let activationCooldown = 8;

// per-tick updates
serverSystem.update = function () {
    //reduce all active cooldowns every tick
    for (let key in cooldowns) {
        if (cooldowns[key] > 0) {
            cooldowns[key] = cooldowns[key] - 1;
            //TODO: maybe check here if the counter hits zery and if the player is still breaking a block, then set of an explosion at that block as well?
        } else {
            //if the cooldown is at 0 and the player is breaking a block right now, then explode the block.
            let playerBlockPair = breakingBlocks[key];
            if( playerBlockPair!= null){
                explode(playerBlockPair["x"],playerBlockPair["y"],playerBlockPair["z"])
            }
        }
    }
}


/**
 * 'mines' all blocks around and plays the exposion sound
 */
function explode(x, y, z) {
    let fillCommand = "fill " + (x - 1) + " " + (y - 1) + " " + (z - 1) + " " + (x + 1) + " " + (y + 1) + " " + (z + 1) + " air 0 destroy"
    execute(fillCommand)
    let soundCommand = "playsound cauldron.explode @a " + x + " " + y + " " + z
    execute(soundCommand)
}

/**
 * whenever a player starts breaking a block, check the item 
 */
serverSystem.onPlayerBreakingBlock = function (eventData) {
    let usedItem = this.getComponent(eventData.data.player, "minecraft:hand_container").data[0];

    let x = eventData.data["block_position"]["x"];
    let y = eventData.data["block_position"]["y"];
    let z = eventData.data["block_position"]["z"];

    let correctItem = usedItem["__identifier__"] == "explodingpickaxeaddon:explodingpickaxe";
    let cooldownCooledDown = isPlayerAllowed(eventData.data["player"]["id"])
    if (correctItem && cooldownCooledDown) {
        explode(x, y, z)
    } else if (correctItem) {
        startBreaking(eventData.data["player"]["id"], x, y, z)
    }
    //let tickingArea = this.getComponent(eventData.data.player, "minecraft:tick_world").data["ticking_area"];       
    //TODO: Durability
    //TODO: Enchants - will have to find another way to get drops then though, as there Fortune and Silk touch wont be used with the fill - command. 

}
/**
 * removes the player from the list of players that are breaking a block right now.
 */
serverSystem.onPlayerStoppedBreakingBlock = function (eventData)
{
    stopBreaking(eventData.data["player"]["id"])
}

/**
 * Remembers the player and blockpos where mining has been started.
 * @param {Number} playerId 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} z 
 */
function startBreaking(playerId, x, y, z) {
    breakingBlocks[playerId]={"x":x, "y":y, "z":z}
}

/**
 * Removes the player from the list of players who are mining a block right now.
 * @param {Number} playerId 
 */
function stopBreaking(playerId){
    if(breakingBlocks.indexOf(playerId)!=-1){
        delete breakingBlocks[playerId]
    }
}

/**
 * Basically just sends a chat message to all players.
 * @param {String} message 
 */
function message(message) {
    let eventData = serverSystem.createEventData("minecraft:display_chat_event");
    eventData.data.message = message;
    serverSystem.broadcastEvent("minecraft:display_chat_event", eventData);
}

/**
 * Executes the command given as an Argument using the broadcastEvent - method.
 * @param {String} command 
 */
function execute(command) {
    let eventData = serverSystem.createEventData("minecraft:execute_command");
    eventData.data.command = command;
    serverSystem.broadcastEvent("minecraft:execute_command", eventData);
}

/**
 * Checks if the player has been registered to the cooldown listener already, and if so, checks wether his cooldown has run out already.
 * @param {Number} playerId 
 * @returns {Boolean} True, if the player is allowed to use the pickaxe again, false otherwise.
 */
function isPlayerAllowed(playerId) {
    if (playerId in cooldowns) {
        if (cooldowns[playerId] == 0) {
            cooldowns[playerId] = activationCooldown;
            return true;
        } else {
            return false;
        }
    } else {
        cooldowns[playerId] = 4;
        return true;
    }
}