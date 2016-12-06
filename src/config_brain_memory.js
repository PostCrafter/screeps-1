'use strict';

brain.prepareMemory = function() {
  Memory.stats = {};

  Memory.mineralSystemPrice = {};
  Memory.ordersBuy = _.filter(Game.market.getAllOrders(), function(object) {
    if (object.type != ORDER_BUY) {
      return false;
    }
    if (object.resourceType == 'token') {
      return false;
    }
    var patt = /([A-Z]+)(\d+)([A-Z]+)(\d+)/;
    var result = patt.exec(object.roomName);
    if (result[2] % 10 !== 0 && result[4] % 10 !== 0) {
      return false;
    }
    return true;
  });

  if (!Memory.constructionSites) {
    Memory.constructionSites = {};
  }

  if (Game.time % config.constructionSite.maxIdleTime === 0) {
    let constructionSites = {};
    for (let csId in Game.constructionSites) {
      let cs = Game.constructionSites[csId];
      let csMem = Memory.constructionSites[csId];
      if (csMem) {
        if (csMem == cs.progress) {
          console.log(csId + ' constructionSite too old');
          let csObject = Game.getObjectById(csId);
          let returnCode = csObject.remove();
          console.log('Delete constructionSite: ' + returnCode);
          continue;
        }
      }
      constructionSites[csId] = cs.progress;
    }
    Memory.constructionSites = constructionSites;
    console.log('Known constructionSites: ' + Object.keys(constructionSites).length);
  }

  // Cleanup memory
  for (let name in Memory.creeps) {
    if (!Game.creeps[name]) {
      if ((name.startsWith('reserver') && Memory.creeps[name].born < (Game.time - CREEP_CLAIM_LIFE_TIME)) || Memory.creeps[name].born < (Game.time - CREEP_LIFE_TIME)) {
        delete Memory.creeps[name];
      } else {
        var creepMemory = Memory.creeps[name];
        if (creepMemory.killed) {
          delete Memory.creeps[name];
          continue;
        }

        console.log(name, 'Not in Game.creeps', Game.time - creepMemory.born, Memory.creeps[name].base);
        if (Game.time - creepMemory.born < 20) {
          continue;
        }
        if (!creepMemory.role) {
          delete Memory.creeps[name];
          continue;
        }
        try {
          let unit = roles[creepMemory.role];
          if (!unit) {
            delete Memory.creeps[name];
          }
          if (unit.died) {
            unit.died(name, creepMemory);
          } else {
            delete Memory.creeps[name];
          }
        } catch (e) {
          delete Memory.creeps[name];
        }
      }
    }
  }

  if (Game.time % 300 === 0) {
    for (let name in Memory.rooms) {
      // Check for reserved rooms
      let memory = Memory.rooms[name];
      // TODO Disabled, needs to be fixed, somehow too many reserveres where queued
      //      if (memory.reservation) {
      //        let diff = Game.time - memory.reservation.tick;
      //        if (diff > 11) {
      //          let reservation = memory.reservation.reservation || (diff + 1);
      //          let reserved = memory.reservation.reservation - diff;
      //          if (!reserved) {
      //            reserved = 0;
      //          }
      //          console.log(`${name} reservation reserved: ${reserved}`);
      //          //          if (0 < reserved && reserved < 3000) {
      //          if (reserved < 3000) {
      //            let room = Game.rooms[name];
      //            if (room && room !== null) {
      //              let reservers = room.find(FIND_MY_CREEPS, {
      //                filter: function(object) {
      //                  return object.memory.role == 'reserver';
      //                }
      //              });
      //              if (reservers.length > 0) {
      //                continue;
      //              }
      //            }
      //            console.log(name + ' ' + Game.time + ' ' + name + ' ' + JSON.stringify(memory.reservation) + ' hostiles: ' + memory.hostile + ' diff: ' + diff + ' reserverd: ' + reserved);
      //            let base = Game.rooms[memory.reservation.base];
      //            base.memory.queue.push({
      //              role: 'reserver',
      //              target: name,
      //              level: 2
      //            });
      //            base.log('Queuing reserver for ' + name);
      //          }
      //        }
      //      }

      if (!Memory.rooms[name].lastSeen) {
        //        console.log('Deleting ' + name + ' from memory no `last_seen` value');
        delete Memory.rooms[name];
        continue;
      }
      if (Memory.rooms[name].lastSeen < config.room.lastSeenThreshold) {
        console.log('Deleting ' + name + ' from memory older than 100000');
        //delete Memory.rooms[name];
        continue;
      }
    }
  }

  if (config.stats.summary) {

    var interval = 100;
    if (Game.time % interval === 0) {
      console.log('=========================');
      var diff = Game.gcl.progress - Memory.progress;
      Memory.progress = Game.gcl.progress;

      console.log('Progress: ', diff / interval, '/', Memory.myRooms.length * 15);
      console.log('ConstructionSites: ', Object.keys(Memory.constructionSites).length);
      console.log('-------------------------');

      var storageNoString = '';
      var storageLowString = '';
      var storageMiddleString = '';
      var storageHighString = '';
      var storagePower = '';
      var upgradeLess = '';
      for (var id in Memory.myRooms) {
        let name = Memory.myRooms[id];
        let room = Game.rooms[name];
        if (!room || !room.storage) {
          storageNoString += name + ' ';
          continue;
        }
        if (room.storage.store.energy < 200000) {
          storageLowString += name + ':' + room.storage.store.energy + ' ';
        } else if (room.storage.store.energy > 800000) {
          storageHighString += name + ':' + room.storage.store.energy + ' ';
        } else {
          storageMiddleString += name + ':' + room.storage.store.energy + ' ';
        }
        if (room.storage.store.power && room.storage.store.power > 0) {
          storagePower += name + ':' + room.storage.store.power + ' ';
        }
        // TODO 15 it should be
        if (Math.ceil(room.memory.upgraderUpgrade / interval) < 15) {
          upgradeLess += name + ':' + room.memory.upgraderUpgrade / interval + ' ';
        }
        room.memory.upgraderUpgrade = 0;
      }
      console.log('No storage:', storageNoString);
      console.log('Low storage:', storageLowString);
      console.log('Middle storage:', storageMiddleString);
      console.log('High storage:', storageHighString);
      console.log('-------------------------');
      console.log('Power storage:', storagePower);
      console.log('-------------------------');
      console.log('Upgrade less:', upgradeLess);
      console.log('=========================');
    }
  }
};
