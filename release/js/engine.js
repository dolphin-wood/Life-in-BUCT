/*!
 * 2D Engine for DOM
 * Last Edited at 2014-7-8 10:20:53 By Dolphin
 */
var rem = parseInt($('html').css('font-size'), 10);
var scale = rem / 24; // 缩放比例
function parseRem(length) {
    return (parseInt(length, 10) / rem);
}

var player = $('#player');
var playerWrap = $('#player-wrap');
var entryTip = $('#entry-tip');
var _status; // 场景，跳板，触发区，状态值

var role = {
        _width: player.width(),
        _height: player.height()
    },
    scenes = {
        moveLength: 8 * scale,
        speed: []
    };

var easing = {
    /* ======= easing effect ========
     * t: current time（当前时间）
     * b: beginning value（初始值）
     * c: change in value（变化量）
     * d: duration（持续时间）
     ==============================*/
    easeInCubic: function(t, b, c, d) {
        return c * (t /= d) * t * t + b;
    },
    easeOutCubic: function(t, b, c, d) {
        return c * ((t = t / d - 1) * t * t + 1) + b;
    }
};

// 创建角色
role.createAnime = function(beginValue, changeValue) {
    // 创建动画帧
    var change = Math.abs(changeValue);
    var frames = (Math.sqrt(change / 8) * 20) | 0;
    var anime = [];
    if (changeValue > 0) {
        // jump
        for (var i = 0; i <= frames; i++) {
            anime.push(easing.easeOutCubic(i, beginValue, changeValue, frames));
        }
    } else {
        // fall
        for (var i = 0; i <= frames; i++) {
            anime.push(easing.easeInCubic(i, beginValue, changeValue, frames));
        }
    }
    return anime;
}

role.jump = function() {
    if (_status.isJumping) return; // 正在跳跃时不激活跳跃状态
    _status.isJumping = true;
    player.addClass('jump');
    var startHeight = _status.isOnBoard ? boards.targetHeight[boards.curIndex] : 0;
    var anime = role.createAnime(startHeight, 8);
    var curFrame = 0;
    var _run = function() {
        player.css('bottom', anime[curFrame++] + 'rem');
        if (curFrame < anime.length) requestAnimationFrame(_run);
        else return role.fall(anime[curFrame - 1]);
    }
    _run();
}

role.fall = function(startHeight) {
    if (!_status.isJumping) _status.isJumping = true;
    startHeight = startHeight || boards.targetHeight[boards.curIndex];
    var anime = role.createAnime(startHeight, -startHeight);
    var curFrame = 0;
    var prevFrameHeight, curFrameHeight, hitHeight;
    var _run = function() {
        prevFrameHeight = anime[curFrame - 1];
        curFrameHeight = anime[curFrame++];
        hitHeight = role.checkHit(prevFrameHeight, curFrameHeight);
        player.css('bottom', (hitHeight || curFrameHeight) + 'rem');
        if (hitHeight) {
            _status.isOnBoard = true;
            return role.repeat();
        }
        if (curFrame < anime.length) requestAnimationFrame(_run);
        else {
            _status.isOnBoard = false;
            return role.repeat();
        }
    }
    _run();
}

role.checkHit = function(prevFrameHeight, curFrameHeight) {
    /* ============= 检测碰撞 =============
     * 策略如下：
     * 下降时检测每一步的高度
     * 如果当前高度小于跳板高度，且前一帧高度大于跳板高度
     * 则视为进入跳板区间，返回跳板高度
     * 否则自由下落
     ====================================*/
    if (boards.isInArea) {
        var isActive = $(boards.targets[boards.curIndex]).css('opacity'); // 是否激活
        if (isActive === '1') {
            // 进入跳板高度区间
            var targetHeight = boards.targetHeight[boards.curIndex];
            if (prevFrameHeight >= targetHeight && curFrameHeight <= targetHeight)
                return targetHeight;
        }
    }
}
role.repeat = function() {
    /* ============= 重复跳跃 =============
     * 策略如下：
     * 如果上方向键按下
     * 则激活二次跳跃
     ====================================*/
    player.removeClass('jump');
    _status.isJumping = false;
    if (_status.upPressed) role.jump();
};

// 创建场景
scenes.moveForward = function() {
    if (_status.rightPressed) {
        if (_status.isEnd) {
            playerWrap.css('left', function(index, value) {
                // 终点，前进区间为 [role.pivot, role.max]
                value = parseInt(value, 10) || 0;
                value += scenes.moveLength;
                if (value <= role.max) {
                    spy(value - role.pivot - _status.forwardMax);
                    return value;
                } else return role.max;
            });
        } else if (_status.isStart) {
            playerWrap.css('left', function(index, value) {
                // 起点，前进区间为 [0, role.pivot]
                value = parseInt(value, 10);
                value += scenes.moveLength;
                if (value >= role.pivot) {
                    _status.isStart = false;
                    return role.pivot;
                } else {
                    spy(value - role.pivot);
                    return value;
                }
            });
        } else {
            scenes.targets.css('left', function(index, value) {
                value = parseInt(value, 10) || 0;
                value -= scenes.moveLength * scenes.speed[index]; // 移动步长为 scenes.moveLength * speed
                if (index === 0) {
                    if (value <= _status.forwardMax) {
                        _status.isEnd = true;
                        return _status.forwardMax; // 主场景到终点则停止
                    } else {
                        spy(-value);
                        return value;
                    }
                } else return value;
            });
        }
        requestAnimationFrame(function() {
            scenes.moveForward(speed);
        });
    }
};
scenes.moveBackward = function() {
    if (_status.leftPressed) {
        if (_status.isStart) {
            // 起点，后退区间为 [0, role.pivot]
            playerWrap.css('left', function(index, value) {
                value = parseInt(value, 10);
                value -= scenes.moveLength;
                if (value >= 0) {
                    spy(value - role.pivot);
                    return value;
                } else return 0;
            });
        } else if (_status.isEnd) {
            playerWrap.css('left', function(index, value) {
                // 终点，后退区间为 [role.pivot, role.max]
                value = parseInt(value, 10);
                value -= scenes.moveLength;
                if (value <= role.pivot) {
                    _status.isEnd = false;
                    return role.pivot;
                } else {
                    spy(value - role.pivot - _status.forwardMax);
                    return value;
                }
            });
        } else {
            scenes.targets.css('left', function(index, value) {
                value = parseInt(value, 10);
                value += scenes.moveLength * scenes.speed[index];
                if (index === 0) {
                    if (value >= 0) {
                        _status.isStart = true;
                        return 0;
                    } else {
                        spy(-value);
                        return value;
                    }
                } else return value;
            });
        }
        requestAnimationFrame(function() {
            scenes.moveBackward(speed);
        });
    }
};

function createTargets() {};
createTargets.prototype.savePrev = function(areaIn, areaOut, curIndex) {
    this.isInArea = false;
    this.isInAreaPrev = true;
    this.areaInPrev = areaIn;
    this.areaOutPrev = areaOut;
    this.prevIndex = curIndex;
    if (this.savedCallback) this.savedCallback();
}
createTargets.prototype.spy = function(sceneMoved) {
    /* =========== 进入区域检测 ===========
     * 策略如下：
     * 如果之前在目标区间（此时必不在）
     * 则判断是否进入之前区域
     * 如果进入，则改变当前索引为之前索引
     * 否则判断是否进入下一目标区间
     ====================================*/
    if (this.isInAreaPrev) {
        if (sceneMoved >= this.areaInPrev && sceneMoved <= this.areaOutPrev) {
            this.isInArea = true;
            this.isInAreaPrev = false;
            this.curIndex = this.prevIndex;
        }
    }
    var areaIn = this.areaIn[this.curIndex],
        areaOut = this.areaOut[this.curIndex];
    if (this.isInArea) {
        if (sceneMoved > areaOut) {
            // 离开目标区域
            this.savePrev(areaIn, areaOut, this.curIndex);
            if (this.curIndex < this.count - 1) this.curIndex++;
        } else if (sceneMoved < areaIn) {
            this.savePrev(areaIn, areaOut, this.curIndex);
            if (this.curIndex > 0) this.curIndex--;
        }
    } else {
        if (sceneMoved >= areaIn && sceneMoved <= areaOut) {
            // 进入目标区域
            this.isInArea = true;
            this.isInAreaPrev = false;
        }
    }
}

var boards = new createTargets();
boards.getData = function() {
    // 获取跳板数据
    var targetHeight = []; // 目标高度
    var areaInData = [];
    var areaOutData = []; // 进出跳板位置点
    var sceneMoved = scenes.targets.offset().left;
    this.targets.each(function() {
        // 刷新位置
        var bottom = parseRem($(this).css('bottom'));
        var curOffsetBottom = bottom + parseRem($(this).css('border-top-width')) * 2 + parseRem($(this).height()); // .css('border-top-width') to fix FF/IE
        // 补差手臂到腿的距离
        var areaIn = $(this).offset().left - sceneMoved - _status.pivot - 10; // 进入区间
        var areaOut = areaIn + $(this).width() + 30; // 离开区间
        targetHeight.push(curOffsetBottom);
        areaInData.push(areaIn);
        areaOutData.push(areaOut);
    });
    this.targetHeight = targetHeight;
    this.areaIn = areaInData;
    this.areaOut = areaOutData;
    return this;
}
boards.savedCallback = function() {
    if (_status.isOnBoard && !_status.isJumping) role.fall(); // 正在跳跃则不激发坠落
}

var triggers = new createTargets();
triggers.getData = function() {
    var areaInData = [];
    var areaOutData = [];
    var onboard = [];
    var sceneMoved = scenes.targets.offset().left;
    this.targets.each(function() {
        var areaIn = $(this).offset().left - sceneMoved - _status.pivot - role._width / 2;
        var areaOut = areaIn + $(this).width() + role._width;
        areaInData.push(areaIn);
        areaOutData.push(areaOut);
        onboard.push($(this).data('onboard'));
    });
    this.areaIn = areaInData;
    this.areaOut = areaOutData
    this.onboard = onboard;
    return this;
}

var entries = new createTargets();
entries.getData = triggers.getData;

function spy(sceneMoved) {
    boards.spy(sceneMoved);
    triggers.spy(sceneMoved);
    entries.spy(sceneMoved);
    var index = entries.curIndex;
    if (entries.isInArea && entries.isActive[index] && entries.onboard[index] === _status.isOnBoard)
        entryTip.addClass('on');
    else entryTip.removeClass('on');
}
