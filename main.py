tiles.set_current_tilemap(tilemap("""world"""))

chosenCountry = MultiplayerState.create()
chosenCountry = 0

fight = SpriteKind.create()

def on_controller_event_connected(player):
    crosshair: Sprite = None

    crosshair = sprites.create(assets.image("""bob"""), SpriteKind.player)

    mp.set_player_sprite(player, crosshair)
    
    mp.move_with_buttons(player)

    mp.set_player_state(player, chosenCountry, 0)

    if player == mp.get_player_by_index(0):
        scene.camera_follow_sprite(crosshair)
    
    mp.set_player_indicators_visible(True)

mp.on_controller_event(ControllerEvent.CONNECTED, on_controller_event_connected)

class aiStrategy:
    def __init__(self, name: str, aggressiveness: int, peacefulness: int, trading: int):
        self.name = name
        self.aggressiveness = aggressiveness
        self.peacefulness = peacefulness
        self.trading = trading

class countryType:
    def __init__(self, name: str, pop: int, eco: int, strategy: aiStrategy, isAi: bool, casualties: int, tilesLost: int, warTarget: str, warCooldown: int, peaceCooldown: int, peaceTarget: str, borderingCountries: List[countryType], tradePartners: List[countryType], enemies: List[countryType], isDestroyed: bool, chargeCooldown: int, chargeTarget: str, tiles: List[tiles.Location]):
        self.name = name
        self.pop = pop
        self.eco = eco
        self.strategy = strategy
        self.isAi = isAi
        self.casualties = casualties
        self.tilesLost = tilesLost
        self.warTarget = warTarget
        self.warCooldown = warCooldown
        self.peaceCooldown = peaceCooldown
        self.peaceTarget = peaceTarget
        self.borderingCountries = borderingCountries
        self.tradePartners = tradePartners
        self.enemies = enemies
        self.isDestroyed = isDestroyed
        self.chargeCooldown = chargeCooldown
        self.chargeTarget = chargeTarget
        self.tiles = tiles
    
    def getTileImage(self):
        tileImage = tiles.tile_image_at_location(self.tiles[0])
        return tileImage

germany = countryType("Germany", 200000, 4, aiStrategy("", 0, 0, 0), True, 0, 0, None, 0, 0, None, [], [], [], False, 0, None, tiles.get_tiles_by_type(assets.tile("""germanTile""")))
france = countryType("France", 100000, 2, aiStrategy("", 0, 0, 0), True, 0, 0, None, 0, 0, None, [], [], [], False, 0, None, tiles.get_tiles_by_type(assets.tile("""franceTile""")))
belgium = countryType("Belgium", 50000, 1, aiStrategy("", 0, 0, 0), True, 0, 0, None, 0, 0, None, [], [], [], False, 0, None, tiles.get_tiles_by_type(assets.tile("""belgiumTile""")))
britain = countryType("United Kingdom", 150000, 3, aiStrategy("", 0, 0, 0), True, 0, 0, None, 0, 0, None, [], [], [], False, 0, None, tiles.get_tiles_by_type(assets.tile("""britainTile""")))

players = mp.all_players()

countries: List[countryType] = [germany, france, belgium, britain]

def chooseCountry(player):
    sprite = mp.get_player_sprite(player)
    for country in countries:
        if tiles.tile_at_location_equals(sprite.tilemap_location(), tiles.tile_image_at_location(country.tiles[0])):
            game.show_long_text("Player " + mp.get_player_property(player, mp.PlayerProperty.INDEX + 1) + " has chosen " + country.name, DialogLayout.BOTTOM)
            country.isAi = False
            country.playerChosen = mp.get_player_property(player, mp.PlayerProperty.INDEX)

def popGain(country: countryType):
    country.pop += len(country.tiles) * 12
    return country.pop

def ecoGain(country: countryType):
    recession = Math.percent_chance(5)
    if recession:
        depression = Math.percent_chance(1)
        country.eco -= len(country.tiles) / 100
        if depression:
            country.eco -= len(country.tiles) / 10
    else:
        country.eco += len(country.tiles) / 100

def addStrategy(country: countryType):
    strategy = country.strategy
    strategy.aggressiveness = randint(1, 100)
    strategy.peacefulness = randint(1, 100)
    strategy.trading = randint(1, 100)
    strategy.name = "aggressive" if strategy.aggressiveness > strategy.peacefulness and strategy.aggressiveness > strategy.trading else "peaceful" if strategy.peacefulness > strategy.aggressiveness and strategy.peacefulness > strategy.trading else "trading"
    return strategy

def declareWar(country: countryType, enemy: countryType):
    country.warTarget = None
    game.show_long_text(country.name + " declares war on " + enemy.name, DialogLayout.BOTTOM)
    for tradeCountry in country.tradePartners:
        if tradeCountry.name == enemy.name:
            game.show_long_text(country.name + " cuts trade with " + enemy.name, DialogLayout.BOTTOM)
            tradeIndex = getEnemyIndex(country, enemy)
            enemyTradeIndex = getEnemyIndex(enemy, country)
            country.tradePartners.remove_at(tradeIndex)
            enemy.tradePartners.remove_at(enemyTradeIndex)
    country.enemies.append(enemy)
    enemy.enemies.append(country)

def declarePeace(country: countryType, enemy: countryType):
    country.peaceCooldown = 20
    country.peaceTarget = None
    accept = Math.percent_chance(15 + ( enemy.tilesLost * 5) + (enemy.casualties / 10000))
    if accept:
        game.show_long_text(country.name + " declares peace with " + enemy.name, DialogLayout.BOTTOM)
        enemyIndex = getEnemyIndex(country, enemy) 
        country.enemies.remove_at(enemyIndex)
        countryIndex = getEnemyIndex(enemy, country)
        enemy.enemies.remove_at(countryIndex)
        country.tilesLost = 0
        enemy.tilesLost = 0
        country.casualties = 0
        enemy.casualties = 0
    else:
        game.show_long_text(enemy.name + " refuses peace with " + country.name, DialogLayout.BOTTOM)

def declareTrade(country: countryType, enemy: countryType):
    accept = Math.percent_chance(50)
    if accept:
        game.show_long_text(country.name + " trades with " + enemy.name, DialogLayout.BOTTOM)
        country.tradePartners.append(enemy)
        enemy.tradePartners.append(country)

def getEnemy(country: countryType, targetCountry: countryType):
    for enemy in country.enemies:
        isEnemy = True if enemy.name == targetCountry.name else False
        if isEnemy:
            break
    return isEnemy

def getTradePartner(country: countryType, targetCountry: countryType):
    for tradePartner in country.tradePartners:
        isTradePartner = True if tradePartner.name == targetCountry.name else False
        if isTradePartner:
            break
    return isTradePartner

def getEnemyIndex(country: countryType, targetCountry: countryType):
    index = 0
    returnIndex = 0
    for enemy in country.enemies:
        if enemy.name == targetCountry.name:
            returnIndex = index
            return returnIndex
            break
        index += 1
    return returnIndex

def getCountryByPlayer(p: player):
    for country in countries:
        if mp.get_player_property(p, mp.PlayerProperty.INDEX) == country.playerChosen:
            return country
            break
    return None

def getBorderingCountries(country: countryType):
    country.borderingCountries = []
    for tile in country.tiles:
        for targetCountry in countries:
            if tiles.tile_at_location_equals(tile.get_neighboring_location(CollisionDirection.LEFT), targetCountry.getTileImage()):
                country.borderingCountries.append(targetCountry)
            if tiles.tile_at_location_equals(tile.get_neighboring_location(CollisionDirection.RIGHT), targetCountry.getTileImage()):
                country.borderingCountries.append(targetCountry)
            if tiles.tile_at_location_equals(tile.get_neighboring_location(CollisionDirection.TOP), targetCountry.getTileImage()):
                country.borderingCountries.append(targetCountry)
            if tiles.tile_at_location_equals(tile.get_neighboring_location(CollisionDirection.BOTTOM), targetCountry.getTileImage()):
                country.borderingCountries.append(targetCountry)

def removeTile(targetCountry: countryType, targetTile: tiles.Location):
    index = 0
    for tile in targetCountry.tiles:
        if tile.row == targetTile.row and tile.column == targetTile.column:
            targetCountry.tiles.remove_at(index)
        index += 1

def addTile(country: countryType, targetTile: tiles.Location):
    country.tiles.append(targetTile)

def removeCountry(country: countryType):
    index = 0
    for existingCountry in countries:
        if existingCountry.name == country.name:
            countries.remove_at(index)
        index += 1
    game.show_long_text(country.name + " has collapsed", DialogLayout.BOTTOM)
    for enemy in country.enemies:
        enemyIndex = getEnemyIndex(country, enemy)
        country.enemies.remove_at(enemyIndex)
        countryIndex = getEnemyIndex(enemy, country)
        enemy.enemies.remove_at(countryIndex)
    country.isDestroyed = True

def externalEvent(country: countryType, targetCountry: countryType):
    if country.peaceCooldown != 0:
        country.peaceCooldown -= 1
    warFactor = 5 if targetCountry.name == country.warTarget else 1
    peaceFactor = 5 if targetCountry.name == country.peaceTarget else 1
    isEnemy = getEnemy(country, targetCountry)
    isTradePartner = getTradePartner(country, targetCountry)
    war = True if ((randint(1, 10000) + country.strategy.aggressiveness - (len(country.enemies) * 1000))) * warFactor > 9590 and not isEnemy else False
    war and declareWar(country, targetCountry)
    peace = True if (randint(1, 10000) + (country.casualties / 100) + country.strategy.peacefulness + (len(country.enemies) * 100)) * peaceFactor > 9590  and not war and isEnemy and country.peaceCooldown == 0 else False
    peace and declarePeace(country, targetCountry)
    trade = True if randint(1, 10000) + (country.strategy.trading / 2) > 9850 and not isTradePartner and not war and not peace and not isEnemy else False
    trade and declareTrade(country, targetCountry)

def internalEvent(country: countryType, targetCountry: countryType):
    if country.chargeCooldown != 0:
        country.chargeCooldown -= 1
    isEnemy = getEnemy(country, targetCountry)
    isEnemyCharging = 2 if targetCountry.chargeCooldown != 0 and targetCountry.chargeTarget == country.name else 1
    charge = True if randint(1, 10000) * isEnemyCharging + ((country.pop / 100000 - targetCountry.pop / 100000) * 100) > 9000 and country.isAi and isEnemy and country.chargeCooldown == 0 else False
    if charge:
        country.chargeCooldown = 80
        country.chargeTarget = targetCountry.name

def battle(country: countryType, targetCountry: countryType, enemyTile: tiles.Location):
    charge = 1
    if not country.pop > 0:
        return
    if country.chargeTarget != None:
        if country.chargeCooldown > 39 and country.chargeTarget == targetCountry.name:
            charge = 20
    attack = Math.percent_chance((1 + ((country.pop / 10000) - (targetCountry.pop / 10000)) + (country.strategy.aggressiveness / 10)) * charge)
    if not attack:
        return
    roll = randint(1, 500) + ((country.pop / 10000) - (targetCountry.pop / 10000))
    if roll < 400:
        failedBattle = sprites.create(assets.image("""failedBattle"""), fight)
        failedBattle.set_position(enemyTile.x, enemyTile.y)
        failedBattle.destroy(effects.fire, 200)
        country.pop -= roll * 10
        country.casualties += roll * 10
    else:
        failedBattle = sprites.create(assets.image("""failedBattle"""), fight)
        failedBattle.set_position(enemyTile.x, enemyTile.y)
        failedBattle.destroy(effects.ashes, 500)
        tiles.set_tile_at(enemyTile, country.getTileImage())
        removeTile(targetCountry, enemyTile)
        addTile(country, enemyTile)
        targetCountry.tilesLost += 1
        targetCountry.pop -= roll * 10
        targetCountry.casualties += roll * 10

def war(country: countryType, targetCountry: countryType):
    for tile in country.tiles:
        if tiles.tile_at_location_equals(tile.get_neighboring_location(CollisionDirection.LEFT), targetCountry.getTileImage()):
            targetTile = tile.get_neighboring_location(CollisionDirection.LEFT)
            battle(country, targetCountry, targetTile)
        if tiles.tile_at_location_equals(tile.get_neighboring_location(CollisionDirection.RIGHT), targetCountry.getTileImage()):
            targetTile = tile.get_neighboring_location(CollisionDirection.RIGHT)
            battle(country, targetCountry, targetTile)
        if tiles.tile_at_location_equals(tile.get_neighboring_location(CollisionDirection.TOP), targetCountry.getTileImage()):
            targetTile = tile.get_neighboring_location(CollisionDirection.TOP)
            battle(country, targetCountry, targetTile)
        if tiles.tile_at_location_equals(tile.get_neighboring_location(CollisionDirection.BOTTOM), targetCountry.getTileImage()):
            targetTile = tile.get_neighboring_location(CollisionDirection.BOTTOM)
            battle(country, targetCountry, targetTile)

germany.strategy = addStrategy(germany)
france.strategy = addStrategy(france)
belgium.strategy = addStrategy(belgium)
britain.strategy = addStrategy(britain)

def runCountry(country: countryType):
    popGain(country)
    ecoGain(country)
    getBorderingCountries(country)
    if len(country.borderingCountries) == 0:
        return
    index = len(country.borderingCountries) - 1
    randomCountry = country.borderingCountries[randint(0, index)]
    if not country.isAi:
        p = mp.player_selector(mp.PlayerNumber.ONE) if country.playerChosen == 0 else mp.player_selector(mp.PlayerNumber.TWO) if country.playerChosen == 1 else mp.player_selector(mp.PlayerNumber.THREE) if country.playerChosen == 2 else mp.player_selector(mp.PlayerNumber.FOUR)
        sprite = mp.get_player_sprite(p)
        mp.set_player_state(p, MultiplayerState.score, country.pop)
        if len(country.tiles) <= 0 and country.isDestroyed == False:
            animation.run_image_animation(sprite, assets.animation("""bobImplode"""), 50, False)
            sprite.destroy(effects.fire)
            country.isDestroyed = True
    if randomCountry.name != country.name:
        externalEvent(country, randomCountry)
        internalEvent(country, randomCountry)
        if len(country.enemies) > 0:
            randomEnemyIndex = len(country.enemies) - 1
            randomEnemy = country.enemies[randint(0, randomEnemyIndex)]
            targetCountry = randomEnemy
            war(country, targetCountry)
    if len(country.tiles) <= 0 and country.isDestroyed == False:
        removeCountry(country)

def Germany():
    runCountry(germany)

def France():
    runCountry(france)

def Belgium():
    runCountry(belgium)

def Britain():
    runCountry(britain)

game.on_update_interval(100, Germany)
game.on_update_interval(100, France)
game.on_update_interval(100, Belgium)
game.on_update_interval(100, Britain)

def on_button_event_a_pressed(player):
    playerSprite = mp.get_player_sprite(player)
    for country in countries:
        if mp.get_player_state(player, chosenCountry) == 0 and tiles.tile_image_at_location(playerSprite.tilemap_location()) == country.getTileImage() and country.isAi:
            chooseCountry(player)
            mp.set_player_state(player, chosenCountry, 1)
            return
        if country.playerChosen == mp.get_player_property(player, mp.PlayerProperty.INDEX) and not country.isAi:
            for warCountry in countries:
                isEnemy = getEnemy(country, warCountry)
                if tiles.tile_image_at_location(playerSprite.tilemap_location()) == warCountry.getTileImage() and warCountry.name != country.name and not isEnemy:
                    playerSprite.say_text("Influenced war with " + warCountry.name, 2000)
                    country.warTarget = warCountry.name
                    country.warCooldown = 60
                    return
        if country.playerChosen == mp.get_player_property(player, mp.PlayerProperty.INDEX) and not country.isAi:
            for peaceCountry in countries:
                isEnemy = getEnemy(country, peaceCountry)
                if tiles.tile_image_at_location(playerSprite.tilemap_location()) == peaceCountry.getTileImage() and peaceCountry.name != country.name and isEnemy and country.peaceCooldown == 0: 
                    playerSprite.say_text("Influenced peace with " + peaceCountry.name, 2000)
                    country.peaceTarget = peaceCountry.name
                    return
                elif country.peaceCooldown != 0:
                    playerSprite.say_text("You have " + country.peaceCooldown + " seconds before you can peace again", 2000)
                    return
mp.on_button_event(mp.MultiplayerButton.A, ControllerButtonEvent.PRESSED, on_button_event_a_pressed)

def on_button_event_b_pressed(player):
    playerSprite = mp.get_player_sprite(player)
    for country in countries:
        if country.playerChosen == mp.get_player_property(player, mp.PlayerProperty.INDEX) and not country.isAi:
            for chargeCountry in countries:
                isEnemy = getEnemy(country, chargeCountry)
                if tiles.tile_image_at_location(playerSprite.tilemap_location()) == chargeCountry.getTileImage() and chargeCountry.name != country.name and isEnemy and country.chargeCooldown == 0:
                    playerSprite.say_text("Currently charging " + chargeCountry.name, 2000)
                    country.chargeTarget = chargeCountry.name
                    country.chargeCooldown = 80
                    return
                elif country.chargeCooldown != 0:
                    playerSprite.say_text("You must wait " + country.chargeCooldown + " seconds to charge again", 2000)
                    return
mp.on_button_event(mp.MultiplayerButton.B, ControllerButtonEvent.PRESSED, on_button_event_b_pressed)

def on_button_event_movement_pressed(player):
    sprite = mp.get_player_sprite(player)
    country: countryType = getCountryByPlayer(player) if getCountryByPlayer(player) != None else None
    if country is None:
        if mp.is_button_pressed(player, mp.MultiplayerButton.UP) or mp.is_button_pressed(player, mp.MultiplayerButton.DOWN) or mp.is_button_pressed(player, mp.MultiplayerButton.LEFT) or mp.is_button_pressed(player, mp.MultiplayerButton.RIGHT):
            animation.run_image_animation(sprite, assets.animation("""bobWalk"""), 100, True)
        else:
            animation.run_image_animation(sprite, assets.animation("""bobStand"""), 100, True)
        return
    if country.isDestroyed == True:
        return
    if mp.is_button_pressed(player, mp.MultiplayerButton.UP) or mp.is_button_pressed(player, mp.MultiplayerButton.DOWN) or mp.is_button_pressed(player, mp.MultiplayerButton.LEFT) or mp.is_button_pressed(player, mp.MultiplayerButton.RIGHT):
        animation.run_image_animation(sprite, assets.animation("""bobWalk"""), 100, True)
    else:
        animation.run_image_animation(sprite, assets.animation("""bobStand"""), 100, True)
mp.on_button_event(mp.MultiplayerButton.UP, ControllerButtonEvent.PRESSED, on_button_event_movement_pressed) or mp.on_button_event(mp.MultiplayerButton.DOWN, ControllerButtonEvent.PRESSED, on_button_event_movement_pressed) or mp.on_button_event(mp.MultiplayerButton.LEFT, ControllerButtonEvent.PRESSED, on_button_event_movement_pressed) or mp.on_button_event(mp.MultiplayerButton.RIGHT, ControllerButtonEvent.PRESSED, on_button_event_movement_pressed)
mp.on_button_event(mp.MultiplayerButton.UP, ControllerButtonEvent.RELEASED, on_button_event_movement_pressed) or mp.on_button_event(mp.MultiplayerButton.DOWN, ControllerButtonEvent.RELEASED, on_button_event_movement_pressed) or mp.on_button_event(mp.MultiplayerButton.LEFT, ControllerButtonEvent.RELEASED, on_button_event_movement_pressed) or mp.on_button_event(mp.MultiplayerButton.RIGHT, ControllerButtonEvent.RELEASED, on_button_event_movement_pressed)