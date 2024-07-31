const { Sequelize, DataTypes, QueryTypes, Op } = require('sequelize');
const sequelize = new Sequelize('tg', 'root', '12345', {
    host: 'localhost',
    dialect: 'mysql',
});
// Модель GroupStud
const GroupStud = sequelize.define('Group_Stud', {
    GROUP_ID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    GROUP_NAME: {
        type: DataTypes.STRING(255),
        allowNull: false,
		unique: true
    },
    IS_APPROVED: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    CREATED_AT: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    CREATOR_ID: {
        type: DataTypes.INTEGER
    }
}, {
    tableName: 'GROUP_STUD',
    timestamps: false
});

// Модель Users
const Users = sequelize.define('Users', {
    USER_ID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    USERNAME: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    TELEGRAM_ID: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true
    },
    ROLE_GLOBAL: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user'
    },
    CREATED_AT: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
}, {
    tableName: 'USERS',
    timestamps: false
});

// Определение ассоциаций
GroupStud.belongsTo(Users, { foreignKey: 'CREATOR_ID', as: 'Creator' });
Users.hasMany(GroupStud, { foreignKey: 'CREATOR_ID', as: 'Groups' });
// Модель Subjects
const Subjects = sequelize.define('Subjects', {
    SUBJECT_ID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    SUBJECT_NAME: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
	GROUP_ID: {
		type: DataTypes.INTEGER,
		allowNull: false
	},
	IS_APPROVED: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	CREATOR_TELEGRAM_ID: {
		type: DataTypes.INTEGER,
		allowNull: false
	},
	IS_FOR_ALL: {
		type: DataTypes.BOOLEAN,
		defaultValue : false
	}
}, {
    tableName: 'SUBJECTS',
    timestamps: false
});

// Модель UserGroups
const UserGroups = sequelize.define('UserGroups', {
    USER_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    GROUP_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    ROLE: {
        type: DataTypes.ENUM('student', 'curator', 'admin'),
        allowNull: false,
        defaultValue: 'student'
    }
}, {
    tableName: 'USER_GROUPS',
    timestamps: false
});

UserGroups.belongsTo(Users, { foreignKey: 'USER_ID' });
UserGroups.belongsTo(GroupStud, { foreignKey: 'GROUP_ID' });

// Модель Tasks
const Tasks = sequelize.define('Tasks', {
    TASK_ID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    USER_ID: {
        type: DataTypes.INTEGER
    },
    GROUP_ID: {
        type: DataTypes.INTEGER,
		allowNull: true,
        defaultValue: null
    },
    SUBJECT_ID: {
        type: DataTypes.INTEGER,
		allowNull: true,
		defaultValue: null
    },
    TITLE: {
        type: DataTypes.STRING(255),
		allowNull: false
    },
    DESCRIPTION: {
        type: DataTypes.TEXT,
		allowNull: false
    },
    DEADLINE: {
        type: DataTypes.DATE,
		allowNull: false
    },
    IS_COMPLETED: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    CREATED_AT: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
	FOR_ALL: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	IS_OFFER_FOR_ALL: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	}
}, {
    tableName: 'TASKS',
    timestamps: false
});

Tasks.belongsTo(Users, { foreignKey: 'USER_ID' });
Tasks.belongsTo(GroupStud, { foreignKey: 'GROUP_ID' });
Tasks.belongsTo(Subjects, { foreignKey: 'SUBJECT_ID' });

// Модель Schedule
const Schedule = sequelize.define('Schedule', {
    GROUP_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    SUBJECT_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    LESSON_DATE: {
        type: DataTypes.DATE,
        primaryKey: true
    },
    LESSON_TIME: {
        type: DataTypes.TIME,
        primaryKey: true
    }
}, {
    tableName: 'SCHEDULE',
    timestamps: false
});

Schedule.belongsTo(GroupStud, { foreignKey: 'GROUP_ID' });
Schedule.belongsTo(Subjects, { foreignKey: 'SUBJECT_ID' });

// Модель Events
const Events = sequelize.define('Events', {
    EVENT_ID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    EVENT_NAME: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    EVENT_DATE: {
        type: DataTypes.DATE
    },
    EVENT_TIME: {
        type: DataTypes.TIME
    },
    LOCATION: {
        type: DataTypes.STRING(255)
    },
    DESCRIPTION: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'EVENTS',
    timestamps: false
});

// Модель Notifications
const Notifications = sequelize.define('Notifications', {
    NOTIFICATION_ID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    USER_ID: {
        type: DataTypes.INTEGER,
		allowNull: true
    },
    TASK_ID: {
        type: DataTypes.INTEGER,
		allowNull: true
    },
    EVENT_ID: {
        type: DataTypes.INTEGER,
		allowNull: true
    },
    NOTIFICATION_DATE: {
        type: DataTypes.DATE
    },
    NOTIFICATION_TIME: {
        type: DataTypes.TIME
    },
    MESSAGE: {
        type: DataTypes.TEXT
    },
    IS_SENT: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    CREATED_AT: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
}, {
    tableName: 'NOTIFICATIONS',
    timestamps: false
});

Notifications.belongsTo(Users, { foreignKey: 'USER_ID' });
Notifications.belongsTo(Tasks, { foreignKey: 'TASK_ID' });
Notifications.belongsTo(Events, { foreignKey: 'EVENT_ID' });

// Модель GroupRequests
const GroupRequests = sequelize.define('GroupRequests', {
    REQUEST_ID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    REQUESTER_ID: {
        type: DataTypes.INTEGER
    },
    GROUP_NAME: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    REQUEST_DATE: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    IS_APPROVED: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'GROUP_REQUESTS',
    timestamps: false
});

GroupRequests.belongsTo(Users, { foreignKey: 'REQUESTER_ID' });

const UserStates = sequelize.define('UserState', {
    TELEGRAM_ID: {
        type: DataTypes.BIGINT,
        primaryKey: true
    },
    STATE: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
	GROUP_ID: {
		type: DataTypes.INTEGER,
		allowNull: true
	},
	EVENT_ID: {
		type: DataTypes.INTEGER,
		allowNull: true
	},
	USER_ID: {
		type: DataTypes.BIGINT,
		allowNull: true
	},
	TASK_ID: {
		type: DataTypes.INTEGER,
		allowNull: true
	},
	SUBJECT_ID: {
		type: DataTypes.INTEGER,
		allowNull: true
	},
	GROUP_NAME: {
		type: DataTypes.STRING(255),
		allowNull: true
	},
	REQUEST_ID: {
		type: DataTypes.INTEGER,
		allowNull: true
	}
}, {
	tableName: 'UserStates',
    timestamps: false
});

/*
sequelize.sync({force: true}).then(result=>{
  console.log(result);
})
.catch(err=> console.log(err));
*/
module.exports = {
    sequelize,
    GroupStud,
    Users,
    Subjects,
    UserGroups,
    Tasks,
    Schedule,
    Events,
    Notifications,
    GroupRequests,
	UserStates
};