// A-Frame component that makes the rig fly like a bird when the controllers are moved like wings
//
// leftWingId, rightWingId: ids of the left and right hand controllers, both need the wing component
// rigId: id of the rig entity, which encapsulates the camera and controllers

AFRAME.registerComponent('birdman', {
  schema: {
    leftWingId: {type: 'string', default: 'leftHand'}, // id of the left hand controller
    rightWingId: {type: 'string', default: 'rightHand'}, // id of the right hand controller
    rigId: {type: 'string', default: 'rig'}, // id of the rig
  },
  
  init: function() {
    this.leftWing = document.getElementById(this.data.leftWingId);
    this.rightWing = document.getElementById(this.data.rightWingId);

    this.leftHand = this.leftWing.object3D.position;
    this.rightHand = this.rightWing.object3D.position;
    this.rigPos = document.getElementById(this.data.rigId).object3D.position;
    this.rigRot = document.getElementById(this.data.rigId).object3D.rotation;

    this.dir = new THREE.Vector3(0, 0, 0); // horizontal movement direction

    this.VAXIS = new THREE.Vector3(0, 1, 0);
  },

  tick: function (time, timeDelta) {
     
    // PJH 禁止进入地下
    if (this.rigPos.y < 0) {
      this.rigPos.y = 0;
    }
    // PJH 禁用滑翔
    return

    // 获取左右控制器的移动方向（从wing组件获取）
    let leftDir = this.leftWing.components.wing.dir;
    let rightDir = this.rightWing.components.wing.dir;

    // 创建一个新的向量用于存储当前帧的移动方向
    let dir = new THREE.Vector3(0, 0, 0);
    // 计算两个手柄之间的距离（手臂跨度）
    let armWidth = this.leftHand.distanceTo(this.rightHand);

    // 检测是否两个控制器都在向下移动
    let bothControllersMovingDown = leftDir.y >= 0 && rightDir.y >= 0;
    if (bothControllersMovingDown) {
      // 垂直移动：控制器向下移动时角色上升，手臂跨度越大上升越快
      dir.y = (leftDir.y + rightDir.y) * (armWidth + 0.5);
      
      // 横向移动：X轴和Z轴的移动受控制器水平移动的影响
      // 这是实现横向移动的关键部分，根据手柄的水平移动方向计算角色的横向移动
      dir.x = leftDir.x + rightDir.x;  // X轴横向移动（左右方向）
      dir.z = leftDir.z + rightDir.z;  // Z轴横向移动（前后方向）
    }

    // 当角色在空中时应用滑翔物理效果
    if (this.rigPos.y > 0) {
      const WEIGHT = 60; // 角色重量（公斤）
      const SURFACE = 4; // 翅膀总面积（平方米）
      const UPLIFT = 1.3; // 海平面升力系数
      let vspeed = this.vSpeed_mps(WEIGHT, SURFACE, UPLIFT, 0.2);
      let hspeed = this.hSpeed_mps(WEIGHT, SURFACE, UPLIFT, 1.0);

      // 应用重力使角色缓慢下降
      dir.y -= vspeed * timeDelta / 1000;

      // 当横向移动速度过快时，应用阻力使其减速
      let slow_down_factor = 0.99;
      if (this.dir.length() * 1000 / timeDelta > 2 * hspeed) {
        this.dir.x *= slow_down_factor;
        this.dir.z *= slow_down_factor;
      }

      // 当两只手高度不同时，使角色旋转（左右倾斜转向）
      let armHeightDiff = this.leftHand.y - this.rightHand.y;
      let areHandsDifferentHeight = Math.abs(armHeightDiff) > 0.2;
      if (areHandsDifferentHeight) {
        let angle = Math.tan(armHeightDiff / armWidth);
        this.rigRot.y -= angle / 100;
      }      
    } else {
      // 当角色在地面上时，停止所有滑翔移动
      this.dir.set(0, 0, 0);
    }

    // 根据角色的朝向旋转移动方向向量，确保横向移动与角色朝向一致
    // 这确保了当玩家转身时，左右和前后移动仍然相对于玩家的视角
    dir.applyAxisAngle(this.VAXIS, this.rigRot.y);

    // 将当前帧的移动方向添加到角色位置
    this.rigPos.add(dir);
    // 将累积的滑翔方向添加到角色位置（持续性横向移动）
    this.rigPos.add(this.dir);

    // 将当前帧的横向移动方向累加到滑翔方向中，使移动具有惯性效果
    // 这是横向移动能够持续的关键，即使玩家停止移动手柄
    let factor = 1;
    this.dir.x += dir.x * factor;  // 更新X轴滑翔方向
    this.dir.z += dir.z * factor;  // 更新Z轴滑翔方向
  },

  // calculate vertical speed in meters per second
  vSpeed_mps: function(weight, surface, uplift, drag, density = 1.225) {
    const g = 9.81; // gravity in meters per second squared
    // calculate vertical speed in meters per second
    let wingLoading = weight / surface;
    return drag * Math.sqrt(2 * g * wingLoading / (density * uplift**3));
  },
  
  // calculate horizontal speed in meters per second
  hSpeed_mps: function(weight, surface, uplift, drag, density = 1.225) {
    const g = 9.81; // gravity in meters per second squared
    // calculate horizontal speed in meters per second
    let wingLoading = weight / surface;
    return drag * Math.sqrt(2 * g * wingLoading / (density * uplift));
  }
})
