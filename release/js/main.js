var keyTable = {
    _left: 37,
    _up: 38,
    _right: 39,
    _down: 40
}
var action = {
    upPress: function() {
        _status.upPressed = true;;
        role.jump();
    },
    leftPress: function() {
        player.addClass('run reverse');
        _status.leftPressed = true;
        scenes.moveBackward();
    },
    rightPress: function() {
        player.removeClass('reverse').addClass('run');
        _status.rightPressed = true;
        scenes.moveForward();
    },
    upRelease: function() {
        _status.upPressed = false;
    },
    leftRelease: function() {
        if (!_status.rightPressed) player.removeClass('run');
        else player.removeClass('reverse');
        _status.leftPressed = false;
    },
    rightRelease: function() {
        if (!_status.leftPressed) player.removeClass('run');
        else player.addClass('reverse')
        _status.rightPressed = false;
    },
    triggerOn: function() {
        if (triggers.isInArea) {
            var index = triggers.curIndex;
            var onboard = triggers.onboard[index];
            if (onboard === _status.isOnBoard) {
                var curTrigger = $(triggers.targets[index]);
                var data = curTrigger.data();
                curTrigger.toggleClass('on');
                if (data.action === 'openEntry') {
                    var entryIndex = data.index;
                    entries.isActive[entryIndex] = !entries.isActive[entryIndex];
                }
            }
        }
    },
    enterEntry: function() {
        if (entries.isInArea) {
            var index = entries.curIndex;
            var onboard = entries.onboard[index];
            if (entries.isActive[index] && onboard === _status.isOnBoard) {
                // TODO: 修改入口事件
                entryTip.removeClass('on');
                init.refresh('#scene-1');
            }
        }
    }
}
$(window).keydown(function(e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === keyTable._up && !_status.upPressed) action.upPress();
    if (keyCode === keyTable._left && !_status.leftPressed) action.leftPress();
    if (keyCode === keyTable._right && !_status.rightPressed) action.rightPress();
    if (keyCode === 13 || keyCode === 10) action.enterEntry(); // Enter Key
    if (e.ctrlKey) action.triggerOn();
}).keyup(function(e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === keyTable._left) action.leftRelease();
    if (keyCode === keyTable._up) action.upRelease();
    if (keyCode === keyTable._right) action.rightRelease();
}).resize(function() {
    if (!_status.isResizing && _status.winWidth) {
        _status.isResizing = true;
        setTimeout(function() {
            // chrome resize 重复触发 bug
            _status.isResizing = false;
        }, 100);
        // 移动场景，保持原有相对位置
        var newWidth = $(window).width();
        var changedWidth = (newWidth - _status.winWidth) / 2;
        _status.winWidth = newWidth;
        if (!changedWidth) return;
        init.refresh();
        // 重新定位
        playerWrap.css('left', function(index, value) {
            value = parseInt(value, 10);
            value += changedWidth;
            if (_status.isStart) {
                if (value <= 0) return 0;
                else return value;
            } else {
                if (_status.isEnd) _status.isEnd = false; // 终点则重置居中
                return role.pivot;
            }
        })
        scenes.targets.css('left', function(index, value) {
                value = parseInt(value, 10);
                var newValue = value + changedWidth;
                if (index === 0) {
                    if (newValue >= 0 || value === 0) {
                        _status.isStart = true;
                        return 0;
                    } else if (newValue <= _status.forwardMax || value === _status.forwardMax) {
                        _status.isEnd = true;
                        return _status.forwardMax;
                    } else return newValue;
                } else return newValue;
            })
            // 修正可能出现的卡在半空的错误
        _status.rightPressed = true;
        scenes.moveForward();
        _status.rightPressed = false;
    }
});

var flag;
var valueNum = $('#value-num');
var speed = $('#speed');
speed.mousedown(function() {
    flag = true;
}).mousemove(function() {
    if (flag) {
        var value = parseFloat(this.value);
        valueNum.text(value.toFixed(1))
    }
}).mouseup(function() {
    flag = false;
    $(this).blur();
}).change(function() {
    setSpeed(this.value);
})

function setSpeed(value) {
    value = parseFloat(value);
    scenes.moveLength = 8 * value * scale;
    player.css('animation-duration', .6 / value + 's');
    speed[0].value = value;
    valueNum.text(value.toFixed(1));
    if (localStorage && typeof localStorage === 'object') localStorage.speed = value;
}
if (localStorage && typeof localStorage === 'object') var lastSetValue = localStorage.speed;
if (lastSetValue) setSpeed(lastSetValue);


// touch event
var btnUp = document.getElementById('upward'),
    btnLeft = document.getElementById('backward'),
    btnRight = document.getElementById('forward');

btnUp.addEventListener('touchstart', function(e) {
    e.preventDefault();
    action.upPress();
}, false);
btnUp.addEventListener('touchend', function(e) {
    e.preventDefault();
    action.upRelease();
}, false);
btnLeft.addEventListener('touchstart', function(e) {
    e.preventDefault();
    action.leftPress();
}, false);
btnLeft.addEventListener('touchend', function(e) {
    e.preventDefault();
    action.leftRelease();
}, false);
btnRight.addEventListener('touchstart', function(e) {
    e.preventDefault();
    action.rightPress();
}, false);
btnRight.addEventListener('touchend', function(e) {
    e.preventDefault();
    action.rightRelease();
}, false);


// 初始化
var init = {
    createStatus: function() {
        return {
            winWidth: $(window).width(),
            leftPressed: false,
            upPressed: false,
            rightPressed: false, // 方向键按下状态
            isJumping: false, // 是否跳跃中
            isInArea: false, // 是否进入跳板区间
            isOnBoard: false, // 是否在跳板上
            isStart: true, // 是否起点
            isEnd: false, // 是否终点
            isResizing: false // 是否改变窗口大小
        }
    },
    refresh: function(newScene) {
        if (newScene) {
            // 创建场景
            scenes.parent = $(newScene);
            scenes.targets = scenes.parent.find('.scenes');
            scenes.speed = [];
            scenes.targets.each(function() {
                // 获取速度
                var speed = $(this).data('speed');
                scenes.speed.push(speed);
            });

            // 创建跳板
            boards.targets = scenes.targets.find('.jumpboard');
            boards.count = boards.targets.length; // 跳板数量
            boards.curIndex = 0; // 当前索引
            boards.areaInPrev = boards.areaOutPrev = boards.prevIndex = undefined;

            // 创建触发区
            triggers.targets = scenes.targets.find('.trigger');
            triggers.count = triggers.targets.length;
            triggers.curIndex = 0;
            triggers.areaInPrev = triggers.areaOutPrev = triggers.prevIndex = undefined;

            // 创建入口
            entries.targets = scenes.targets.find('.entry');
            entries.count = entries.targets.length;
            entries.curIndex = 0;
            entries.isActive = [];
            entries.areaInPrev = entries.areaOutPrev = entries.prevIndex = undefined;

            // 初始化
            _status = new this.createStatus();
            player.css('bottom', 0)
            playerWrap.removeAttr('style');
            scenes.targets.removeAttr('style');
            triggers.targets.removeClass('on');
        }
        _status.forwardMax = _status.winWidth - $(scenes.targets[0]).width(); // 最大场景移动长度
        _status.pivot = _status.winWidth / 2; // 基准
        role.pivot = _status.pivot - role._width / 2;
        role.max = _status.winWidth - role._width;
        boards.getData();
        triggers.getData();
        entries.getData();
    }
};
init.refresh('#scene-1');
