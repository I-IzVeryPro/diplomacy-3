tiles.setCurrentTilemap(tilemap`world`)
let chosenCountry = MultiplayerState.create()
chosenCountry = 0
let fight = SpriteKind.create()
mp.onControllerEvent(ControllerEvent.Connected, function on_controller_event_connected(player: mp.Player) {
    let crosshair : Sprite = null
    crosshair = sprites.create(assets.image`bob`, SpriteKind.Player)
    mp.setPlayerSprite(player, crosshair)
    mp.moveWithButtons(player)
    mp.setPlayerState(player, chosenCountry, 0)
    if (player == mp.getPlayerByIndex(0)) {
        scene.cameraFollowSprite(crosshair)
    }
    
    mp.setPlayerIndicatorsVisible(true)
})
class aiStrategy {
    name: string
    aggressiveness: number
    peacefulness: number
    trading: number
    constructor(name: string, aggressiveness: number, peacefulness: number, trading: number) {
        this.name = name
        this.aggressiveness = aggressiveness
        this.peacefulness = peacefulness
        this.trading = trading
    }
    
}

class countryType {
    name: string
    pop: number
    eco: number
    strategy: aiStrategy
    isAi: boolean
    casualties: number
    tilesLost: number
    warTarget: string
    warCooldown: number
    peaceCooldown: number
    peaceTarget: string
    borderingCountries: countryType[]
    tradePartners: countryType[]
    enemies: countryType[]
    isDestroyed: boolean
    chargeCooldown: number
    chargeTarget: string
    tiles: tiles.Location[]
    playerChosen: number
    constructor(name: string, pop: number, eco: number, strategy: aiStrategy, isAi: boolean, casualties: number, tilesLost: number, warTarget: string, warCooldown: number, peaceCooldown: number, peaceTarget: string, borderingCountries: countryType[], tradePartners: countryType[], enemies: countryType[], isDestroyed: boolean, chargeCooldown: number, chargeTarget: string, tiles: tiles.Location[]) {
        this.name = name
        this.pop = pop
        this.eco = eco
        this.strategy = strategy
        this.isAi = isAi
        this.casualties = casualties
        this.tilesLost = tilesLost
        this.warTarget = warTarget
        this.warCooldown = warCooldown
        this.peaceCooldown = peaceCooldown
        this.peaceTarget = peaceTarget
        this.borderingCountries = borderingCountries
        this.tradePartners = tradePartners
        this.enemies = enemies
        this.isDestroyed = isDestroyed
        this.chargeCooldown = chargeCooldown
        this.chargeTarget = chargeTarget
        this.tiles = tiles
    }
    
    public getTileImage(): Image {
        let tileImage = tiles.tileImageAtLocation(this.tiles[0])
        return tileImage
    }
    
}

let germany = new countryType("Germany", 200000, 4, new aiStrategy("", 0, 0, 0), true, 0, 0, null, 0, 0, null, [], [], [], false, 0, null, tiles.getTilesByType(assets.tile`germanTile`))
let france = new countryType("France", 100000, 2, new aiStrategy("", 0, 0, 0), true, 0, 0, null, 0, 0, null, [], [], [], false, 0, null, tiles.getTilesByType(assets.tile`franceTile`))
let belgium = new countryType("Belgium", 50000, 1, new aiStrategy("", 0, 0, 0), true, 0, 0, null, 0, 0, null, [], [], [], false, 0, null, tiles.getTilesByType(assets.tile`belgiumTile`))
let britain = new countryType("United Kingdom", 150000, 3, new aiStrategy("", 0, 0, 0), true, 0, 0, null, 0, 0, null, [], [], [], false, 0, null, tiles.getTilesByType(assets.tile`britainTile`))
let players = mp.allPlayers()
let countries = [germany, france, belgium, britain]
function chooseCountry(player: any) {
    let sprite = mp.getPlayerSprite(player)
    for (let country of countries) {
        if (tiles.tileAtLocationEquals(sprite.tilemapLocation(), tiles.tileImageAtLocation(country.tiles[0]))) {
            game.showLongText("Player " + mp.getPlayerProperty(player, mp.PlayerProperty.Index + 1) + " has chosen " + country.name, DialogLayout.Bottom)
            country.isAi = false
            country.playerChosen = mp.getPlayerProperty(player, mp.PlayerProperty.Index)
        }
        
    }
}

function popGain(country: countryType): number {
    country.pop += country.tiles.length * 12
    return country.pop
}

function ecoGain(country: countryType) {
    let depression: boolean;
    let recession = Math.percentChance(5)
    if (recession) {
        depression = Math.percentChance(1)
        country.eco -= country.tiles.length / 100
        if (depression) {
            country.eco -= country.tiles.length / 10
        }
        
    } else {
        country.eco += country.tiles.length / 100
    }
    
}

function addStrategy(country: countryType): aiStrategy {
    let strategy = country.strategy
    strategy.aggressiveness = randint(1, 100)
    strategy.peacefulness = randint(1, 100)
    strategy.trading = randint(1, 100)
    strategy.name = strategy.aggressiveness > strategy.peacefulness && strategy.aggressiveness > strategy.trading ? "aggressive" : (strategy.peacefulness > strategy.aggressiveness && strategy.peacefulness > strategy.trading ? "peaceful" : "trading")
    return strategy
}

function declareWar(country: countryType, enemy: countryType) {
    let tradeIndex: number;
    let enemyTradeIndex: number;
    country.warTarget = null
    game.showLongText(country.name + " declares war on " + enemy.name, DialogLayout.Bottom)
    for (let tradeCountry of country.tradePartners) {
        if (tradeCountry.name == enemy.name) {
            game.showLongText(country.name + " cuts trade with " + enemy.name, DialogLayout.Bottom)
            tradeIndex = getEnemyIndex(country, enemy)
            enemyTradeIndex = getEnemyIndex(enemy, country)
            country.tradePartners.removeAt(tradeIndex)
            enemy.tradePartners.removeAt(enemyTradeIndex)
        }
        
    }
    country.enemies.push(enemy)
    enemy.enemies.push(country)
}

function declarePeace(country: countryType, enemy: countryType) {
    let enemyIndex: number;
    let countryIndex: number;
    country.peaceCooldown = 20
    country.peaceTarget = null
    let accept = Math.percentChance(15 + enemy.tilesLost * 5 + enemy.casualties / 10000)
    if (accept) {
        game.showLongText(country.name + " declares peace with " + enemy.name, DialogLayout.Bottom)
        enemyIndex = getEnemyIndex(country, enemy)
        country.enemies.removeAt(enemyIndex)
        countryIndex = getEnemyIndex(enemy, country)
        enemy.enemies.removeAt(countryIndex)
        country.tilesLost = 0
        enemy.tilesLost = 0
        country.casualties = 0
        enemy.casualties = 0
    } else {
        game.showLongText(enemy.name + " refuses peace with " + country.name, DialogLayout.Bottom)
    }
    
}

function declareTrade(country: countryType, enemy: countryType) {
    let accept = Math.percentChance(50)
    if (accept) {
        game.showLongText(country.name + " trades with " + enemy.name, DialogLayout.Bottom)
        country.tradePartners.push(enemy)
        enemy.tradePartners.push(country)
    }
    
}

function getEnemy(country: countryType, targetCountry: countryType) {
    let isEnemy: any;
    for (let enemy of country.enemies) {
        isEnemy = enemy.name == targetCountry.name ? true : false
        if (isEnemy) {
            break
        }
        
    }
    return isEnemy
}

function getTradePartner(country: countryType, targetCountry: countryType) {
    let isTradePartner: any;
    for (let tradePartner of country.tradePartners) {
        isTradePartner = tradePartner.name == targetCountry.name ? true : false
        if (isTradePartner) {
            break
        }
        
    }
    return isTradePartner
}

function getEnemyIndex(country: countryType, targetCountry: countryType): number {
    let index = 0
    let returnIndex = 0
    for (let enemy of country.enemies) {
        if (enemy.name == targetCountry.name) {
            returnIndex = index
            return returnIndex
            break
        }
        
        index += 1
    }
    return returnIndex
}

function getCountryByPlayer(p: any): countryType {
    for (let country of countries) {
        if (mp.getPlayerProperty(p, mp.PlayerProperty.Index) == country.playerChosen) {
            return country
            break
        }
        
    }
    return null
}

function getBorderingCountries(country: countryType) {
    country.borderingCountries = []
    for (let tile of country.tiles) {
        for (let targetCountry of countries) {
            if (tiles.tileAtLocationEquals(tile.getNeighboringLocation(CollisionDirection.Left), targetCountry.getTileImage())) {
                country.borderingCountries.push(targetCountry)
            }
            
            if (tiles.tileAtLocationEquals(tile.getNeighboringLocation(CollisionDirection.Right), targetCountry.getTileImage())) {
                country.borderingCountries.push(targetCountry)
            }
            
            if (tiles.tileAtLocationEquals(tile.getNeighboringLocation(CollisionDirection.Top), targetCountry.getTileImage())) {
                country.borderingCountries.push(targetCountry)
            }
            
            if (tiles.tileAtLocationEquals(tile.getNeighboringLocation(CollisionDirection.Bottom), targetCountry.getTileImage())) {
                country.borderingCountries.push(targetCountry)
            }
            
        }
    }
}

function removeTile(targetCountry: countryType, targetTile: tiles.Location) {
    let index = 0
    for (let tile of targetCountry.tiles) {
        if (tile.row == targetTile.row && tile.column == targetTile.column) {
            targetCountry.tiles.removeAt(index)
        }
        
        index += 1
    }
}

function addTile(country: countryType, targetTile: tiles.Location) {
    country.tiles.push(targetTile)
}

function removeCountry(country: countryType) {
    let enemyIndex: number;
    let countryIndex: number;
    let index = 0
    for (let existingCountry of countries) {
        if (existingCountry.name == country.name) {
            countries.removeAt(index)
        }
        
        index += 1
    }
    game.showLongText(country.name + " has collapsed", DialogLayout.Bottom)
    for (let enemy of country.enemies) {
        enemyIndex = getEnemyIndex(country, enemy)
        country.enemies.removeAt(enemyIndex)
        countryIndex = getEnemyIndex(enemy, country)
        enemy.enemies.removeAt(countryIndex)
    }
    country.isDestroyed = true
}

function externalEvent(country: countryType, targetCountry: countryType) {
    if (country.peaceCooldown != 0) {
        country.peaceCooldown -= 1
    }
    
    let warFactor = targetCountry.name == country.warTarget ? 5 : 1
    let peaceFactor = targetCountry.name == country.peaceTarget ? 5 : 1
    let isEnemy = getEnemy(country, targetCountry)
    let isTradePartner = getTradePartner(country, targetCountry)
    let war = (randint(1, 10000) + country.strategy.aggressiveness - country.enemies.length * 1000) * warFactor > 9590 && !isEnemy ? true : false
    war && declareWar(country, targetCountry)
    let peace = (randint(1, 10000) + country.casualties / 100 + country.strategy.peacefulness + country.enemies.length * 100) * peaceFactor > 9590 && !war && isEnemy && country.peaceCooldown == 0 ? true : false
    peace && declarePeace(country, targetCountry)
    let trade = randint(1, 10000) + country.strategy.trading / 2 > 9850 && !isTradePartner && !war && !peace && !isEnemy ? true : false
    trade && declareTrade(country, targetCountry)
}

function internalEvent(country: countryType, targetCountry: countryType) {
    if (country.chargeCooldown != 0) {
        country.chargeCooldown -= 1
    }
    
    let isEnemy = getEnemy(country, targetCountry)
    let isEnemyCharging = targetCountry.chargeCooldown != 0 && targetCountry.chargeTarget == country.name ? 2 : 1
    let charge = randint(1, 10000) * isEnemyCharging + (country.pop / 100000 - targetCountry.pop / 100000) * 100 > 9000 && country.isAi && isEnemy && country.chargeCooldown == 0 ? true : false
    if (charge) {
        country.chargeCooldown = 80
        country.chargeTarget = targetCountry.name
    }
    
}

function battle(country: countryType, targetCountry: countryType, enemyTile: tiles.Location) {
    let failedBattle: Sprite;
    let charge = 1
    if (!(country.pop > 0)) {
        return
    }
    
    if (country.chargeTarget != null) {
        if (country.chargeCooldown > 39 && country.chargeTarget == targetCountry.name) {
            charge = 20
        }
        
    }
    
    let attack = Math.percentChance((1 + (country.pop / 10000 - targetCountry.pop / 10000) + country.strategy.aggressiveness / 10) * charge)
    if (!attack) {
        return
    }
    
    let roll = randint(1, 500) + (country.pop / 10000 - targetCountry.pop / 10000)
    if (roll < 400) {
        failedBattle = sprites.create(assets.image`failedBattle`, fight)
        failedBattle.setPosition(enemyTile.x, enemyTile.y)
        failedBattle.destroy(effects.fire, 200)
        country.pop -= roll * 10
        country.casualties += roll * 10
    } else {
        failedBattle = sprites.create(assets.image`failedBattle`, fight)
        failedBattle.setPosition(enemyTile.x, enemyTile.y)
        failedBattle.destroy(effects.ashes, 500)
        tiles.setTileAt(enemyTile, country.getTileImage())
        removeTile(targetCountry, enemyTile)
        addTile(country, enemyTile)
        targetCountry.tilesLost += 1
        targetCountry.pop -= roll * 10
        targetCountry.casualties += roll * 10
    }
    
}

function war(country: countryType, targetCountry: countryType) {
    let targetTile: tiles.Location;
    for (let tile of country.tiles) {
        if (tiles.tileAtLocationEquals(tile.getNeighboringLocation(CollisionDirection.Left), targetCountry.getTileImage())) {
            targetTile = tile.getNeighboringLocation(CollisionDirection.Left)
            battle(country, targetCountry, targetTile)
        }
        
        if (tiles.tileAtLocationEquals(tile.getNeighboringLocation(CollisionDirection.Right), targetCountry.getTileImage())) {
            targetTile = tile.getNeighboringLocation(CollisionDirection.Right)
            battle(country, targetCountry, targetTile)
        }
        
        if (tiles.tileAtLocationEquals(tile.getNeighboringLocation(CollisionDirection.Top), targetCountry.getTileImage())) {
            targetTile = tile.getNeighboringLocation(CollisionDirection.Top)
            battle(country, targetCountry, targetTile)
        }
        
        if (tiles.tileAtLocationEquals(tile.getNeighboringLocation(CollisionDirection.Bottom), targetCountry.getTileImage())) {
            targetTile = tile.getNeighboringLocation(CollisionDirection.Bottom)
            battle(country, targetCountry, targetTile)
        }
        
    }
}

germany.strategy = addStrategy(germany)
france.strategy = addStrategy(france)
belgium.strategy = addStrategy(belgium)
britain.strategy = addStrategy(britain)
function runCountry(country: countryType) {
    let p: any;
    let sprite: Sprite;
    let randomEnemyIndex: number;
    let randomEnemy: countryType;
    let targetCountry: countryType;
    popGain(country)
    ecoGain(country)
    getBorderingCountries(country)
    if (country.borderingCountries.length == 0) {
        return
    }
    
    let index = country.borderingCountries.length - 1
    let randomCountry = country.borderingCountries[randint(0, index)]
    if (!country.isAi) {
        p = country.playerChosen == 0 ? mp.playerSelector(mp.PlayerNumber.One) : (country.playerChosen == 1 ? mp.playerSelector(mp.PlayerNumber.Two) : (country.playerChosen == 2 ? mp.playerSelector(mp.PlayerNumber.Three) : mp.playerSelector(mp.PlayerNumber.Four)))
        sprite = mp.getPlayerSprite(p)
        mp.setPlayerState(p, MultiplayerState.score, country.pop)
        if (country.tiles.length <= 0 && country.isDestroyed == false) {
            animation.runImageAnimation(sprite, assets.animation`bobImplode`, 50, false)
            sprite.destroy(effects.fire)
            country.isDestroyed = true
        }
        
    }
    
    if (randomCountry.name != country.name) {
        externalEvent(country, randomCountry)
        internalEvent(country, randomCountry)
        if (country.enemies.length > 0) {
            randomEnemyIndex = country.enemies.length - 1
            randomEnemy = country.enemies[randint(0, randomEnemyIndex)]
            targetCountry = randomEnemy
            war(country, targetCountry)
        }
        
    }
    
    if (country.tiles.length <= 0 && country.isDestroyed == false) {
        removeCountry(country)
    }
    
}

game.onUpdateInterval(100, function Germany() {
    runCountry(germany)
})
game.onUpdateInterval(100, function France() {
    runCountry(france)
})
game.onUpdateInterval(100, function Belgium() {
    runCountry(belgium)
})
game.onUpdateInterval(100, function Britain() {
    runCountry(britain)
})
mp.onButtonEvent(mp.MultiplayerButton.A, ControllerButtonEvent.Pressed, function on_button_event_a_pressed(player: mp.Player) {
    let isEnemy: any;
    let playerSprite = mp.getPlayerSprite(player)
    for (let country of countries) {
        if (mp.getPlayerState(player, chosenCountry) == 0 && tiles.tileImageAtLocation(playerSprite.tilemapLocation()) == country.getTileImage() && country.isAi) {
            chooseCountry(player)
            mp.setPlayerState(player, chosenCountry, 1)
            return
        }
        
        if (country.playerChosen == mp.getPlayerProperty(player, mp.PlayerProperty.Index) && !country.isAi) {
            for (let warCountry of countries) {
                isEnemy = getEnemy(country, warCountry)
                if (tiles.tileImageAtLocation(playerSprite.tilemapLocation()) == warCountry.getTileImage() && warCountry.name != country.name && !isEnemy) {
                    playerSprite.sayText("Influenced war with " + warCountry.name, 2000)
                    country.warTarget = warCountry.name
                    country.warCooldown = 60
                    return
                }
                
            }
        }
        
        if (country.playerChosen == mp.getPlayerProperty(player, mp.PlayerProperty.Index) && !country.isAi) {
            for (let peaceCountry of countries) {
                isEnemy = getEnemy(country, peaceCountry)
                if (tiles.tileImageAtLocation(playerSprite.tilemapLocation()) == peaceCountry.getTileImage() && peaceCountry.name != country.name && isEnemy && country.peaceCooldown == 0) {
                    playerSprite.sayText("Influenced peace with " + peaceCountry.name, 2000)
                    country.peaceTarget = peaceCountry.name
                    return
                } else if (country.peaceCooldown != 0) {
                    playerSprite.sayText("You have " + country.peaceCooldown + " seconds before you can peace again", 2000)
                    return
                }
                
            }
        }
        
    }
})
mp.onButtonEvent(mp.MultiplayerButton.B, ControllerButtonEvent.Pressed, function on_button_event_b_pressed(player: mp.Player) {
    let isEnemy: any;
    let playerSprite = mp.getPlayerSprite(player)
    for (let country of countries) {
        if (country.playerChosen == mp.getPlayerProperty(player, mp.PlayerProperty.Index) && !country.isAi) {
            for (let chargeCountry of countries) {
                isEnemy = getEnemy(country, chargeCountry)
                if (tiles.tileImageAtLocation(playerSprite.tilemapLocation()) == chargeCountry.getTileImage() && chargeCountry.name != country.name && isEnemy && country.chargeCooldown == 0) {
                    playerSprite.sayText("Currently charging " + chargeCountry.name, 2000)
                    country.chargeTarget = chargeCountry.name
                    country.chargeCooldown = 80
                    return
                } else if (country.chargeCooldown != 0) {
                    playerSprite.sayText("You must wait " + country.chargeCooldown + " seconds to charge again", 2000)
                    return
                }
                
            }
        }
        
    }
})
function on_button_event_movement_pressed(player: mp.Player) {
    let sprite = mp.getPlayerSprite(player)
    let country = getCountryByPlayer(player) != null ? getCountryByPlayer(player) : null
    if (country === null) {
        if (mp.isButtonPressed(player, mp.MultiplayerButton.Up) || mp.isButtonPressed(player, mp.MultiplayerButton.Down) || mp.isButtonPressed(player, mp.MultiplayerButton.Left) || mp.isButtonPressed(player, mp.MultiplayerButton.Right)) {
            animation.runImageAnimation(sprite, assets.animation`bobWalk`, 100, true)
        } else {
            animation.runImageAnimation(sprite, assets.animation`bobStand`, 100, true)
        }
        
        return
    }
    
    if (country.isDestroyed == true) {
        return
    }
    
    if (mp.isButtonPressed(player, mp.MultiplayerButton.Up) || mp.isButtonPressed(player, mp.MultiplayerButton.Down) || mp.isButtonPressed(player, mp.MultiplayerButton.Left) || mp.isButtonPressed(player, mp.MultiplayerButton.Right)) {
        animation.runImageAnimation(sprite, assets.animation`bobWalk`, 100, true)
    } else {
        animation.runImageAnimation(sprite, assets.animation`bobStand`, 100, true)
    }
    
}

mp.onButtonEvent(mp.MultiplayerButton.Up, ControllerButtonEvent.Pressed, on_button_event_movement_pressed) || mp.onButtonEvent(mp.MultiplayerButton.Down, ControllerButtonEvent.Pressed, on_button_event_movement_pressed) || mp.onButtonEvent(mp.MultiplayerButton.Left, ControllerButtonEvent.Pressed, on_button_event_movement_pressed) || mp.onButtonEvent(mp.MultiplayerButton.Right, ControllerButtonEvent.Pressed, on_button_event_movement_pressed)
mp.onButtonEvent(mp.MultiplayerButton.Up, ControllerButtonEvent.Released, on_button_event_movement_pressed) || mp.onButtonEvent(mp.MultiplayerButton.Down, ControllerButtonEvent.Released, on_button_event_movement_pressed) || mp.onButtonEvent(mp.MultiplayerButton.Left, ControllerButtonEvent.Released, on_button_event_movement_pressed) || mp.onButtonEvent(mp.MultiplayerButton.Right, ControllerButtonEvent.Released, on_button_event_movement_pressed)
