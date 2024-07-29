const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
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
		allowNull: true
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

sequelize.sync({force: true}).then(result=>{
  console.log(result);
})
.catch(err=> console.log(err));

// Инициализация бота
const token = '7345012579:AAEpRCqweK2FLpRMfILGIf4Y9geDkpGdlHw';
const bot = new TelegramBot(token, { polling: true });

//Все нижеперечисленные действия осуществляются для функции handleMyGroupsInfo()
//В меню группы должны быть кнопки "Расписание занятий", "Актуальные задачи", "Создать учебный предмет" (только куратор),
//"Добавить задачу", "Добавить предмет в расписание", "Заявки на задачи" (только куратор), "Заявки на вступление в группу" (только куратор),
//"Список учебных предметов" с последующими кнопками удаления существующих предметов (только куратор), "Уведомения для группы" (только куратор).
//При нажатии на кнопку "Актуальные задачи" выводится список задач в виде кнопок, при нажатии на них выводится фулл описание задачи и
//кнопка "предложить группе", которая отправляет куратору запрос на вывод задачи группе, а не только пользователю + кнопка "Назад"



// Функция для отображения главного меню
// *Доработать действия при нажатии на "Уведомления".
const showMainMenu = (chatId) => {
    bot.sendMessage(chatId, 'Главное меню', {
        reply_markup: {
            keyboard: [
                [{ text: 'Создать группу' }],
                [{ text: 'Заявки на создание групп' }, { text: 'Информация о моих группах' }],
                [{ text: 'Вступить в группу' }],
                [{ text: 'Уведомления' }, { text: 'Мероприятия' }]
            ]
        }
    });
};

const showGroupInfo = async (chatId, groupId) => {
	console.log('Открытие меню для группы с id: ' + groupId);
	const grName = await GroupStud.findOne({where: {GROUP_ID: groupId}});
    bot.sendMessage(chatId, 'Главное меню группы ' + grName.GROUP_NAME, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Расписание занятий', callback_data: `show_schedule_${groupId}` }, { text: 'Главное меню', callback_data: `back_main` }],
                [{ text: 'Актуальные задачи', callback_data: `actual_tasks_${groupId}` }, { text: 'Добавить задачу', callback_data: `add_task_${groupId}` }],
                [{ text: 'Добавить учебный предмет', callback_data: `add_subject_${groupId}` }, { text: 'Заявки на задачи для группы', callback_data: `requests_tasks_${groupId}` }],
				[{ text: 'Список учебных предметов', callback_data: `subject_list_${groupId}` }, { text: 'Заявки на вступление в группу', callback_data: `requests_join_${groupId}` }],
				[{ text: 'Отправить уведомление группе', callback_data: `send_notification_${groupId}` }]
            ]
        }
    });
};

// Обработка команды /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.username;
    const telegramId = msg.chat.id; // Получаем TELEGRAM_ID из chat.id

    try {
        // Проверка, существует ли пользователь
        let user = await Users.findOne({ where: { TELEGRAM_ID: telegramId } });
        if (!user) {
            // Если пользователь новый - создание нового пользователя
            user = await Users.create({ USERNAME: username, TELEGRAM_ID: telegramId });
            bot.sendMessage(chatId, `Привет, ${username}!`, {
                reply_markup: {
                    remove_keyboard: true
                }
            });
        }
        showMainMenu(chatId);
    } catch (error) {
        console.error('Error in /start command:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при вводе команды /start.');
    }
});
// Обработка нажатий на кнопки
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === 'Создать группу') {
        handleCreateGroup(chatId);
    } else if (text === 'Заявки на создание групп') {
        handleGroupRequests(chatId);
    } else if (text === 'Информация о моих группах') {
        handleMyGroupsInfo(chatId);
    } else if (text === 'Вступить в группу') {
        handleJoinGroup(chatId);
    } else if (text === 'Уведомления') {
		handleNotification(chatId);
	} else if (text == 'Мероприятия') {
		handleEvent(chatId);
	}
});

// Функция для создания уведомлений для всех пользователей от админов
const handleNotification = async (chatId) => {
	const usr = Users.findOne({where: {TELEGRAM_ID: chatId}});
	if (!usr) {
		bot.sendMessage(chatId, 'Пользователь не существует!');
	} else {
		if (usr.ROLE_GLOBAL === 'admin') {
			//Пользователь админ --> выбор кому присылать уведомления
			bot.sendMessage(chatId, 'Выберите кому прислать уведомление', {
				reply_markup: {
				inline_keyboard: [
					[{ text: 'Уведомить всех', callback_data: `alarm_all` }], 
					[{ text: 'Уведомить группу', callback_data: `alarm_group` }],
					[{ text: 'Уведомить пользователя', callback_data: `alarm_user` }],
					[{text: 'Назад', callback_data: `back_main`}]
				]
				}
			});
		} else {
			//Недостаточно прав
			console.log('Пользователю с тг ' + chatId + ' недостаточно прав для входа в уведомления');
			bot.sendMessage(chatId, 'Недостаточно прав для доступа к уведомлениям');
		}
	}
	showMainMenu(chatId);
	return;
}

// Функция для вывода существующих мероприятий и создания мероприятий админами
const handleEvent = async (chatId) => {
    try {
        // Найти пользователя по TELEGRAM_ID
        const user = await Users.findOne({ where: { TELEGRAM_ID: chatId } });

        if (!user) {
            bot.sendMessage(chatId, 'Ваш аккаунт не найден в системе.');
            return;
        }

        // Проверка на права пользователя
        if (user.ROLE_GLOBAL === 'user') {
            bot.sendMessage(chatId, 'У вас недостаточно прав для доступа к мероприятиям.');
            return;
        }

        if (user.ROLE_GLOBAL === 'admin') {
            bot.sendMessage(chatId, 'Выберите действие:', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Показать все мероприятия', callback_data: 'show_all_events' }],
                        [{ text: 'Создать мероприятие', callback_data: 'create_event' }],
                        [{ text: 'Назад', callback_data: 'back_main' }]
                    ]
                }
            });
        }
		return;
    } catch (error) {
        console.error('Ошибка при обработке событий:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при обработке событий.');
		return;
    }
};

// Функция для обработки создания группы
const handleCreateGroup = async (chatId) => {
    // Запрос названия группы
    bot.sendMessage(chatId, 'Введите название группы, которую хотите создать:', {
        reply_markup: {
            keyboard: [
                [{ text: 'Назад' }] // Кнопка "Назад"
            ],
            one_time_keyboard: true
        }
    });

    // Обработка сообщения
    bot.once('message', async (msg) => {
        const groupName = msg.text;
        const telegramId = msg.from.id;
		
        // Проверка, нажата ли кнопка "Назад"
        if (groupName === 'Назад') {
            showMainMenu(chatId); // Вернуть в главное меню
            return;
        }
		
		try {
			const checkUniqueGroup = await GroupStud.findOne({ where: { GROUP_NAME: groupName } });

			if (checkUniqueGroup) {
				bot.sendMessage(chatId, 'Введите другое название группы. Данная группа уже существует');
				handleCreateGroup(chatId);
				return;
			}
		} catch (error) {
			bot.sendMessage(chatId, 'Ошибка при проверке названия группы на уникальность. Возвращение в главное меню');
			showMainMenu(chatId);
			return;
		}	
		
        try {
            // Найти пользователя по TELEGRAM_ID
            const user = await Users.findOne({ where: { TELEGRAM_ID: telegramId } });

            if (!user) {
                bot.sendMessage(chatId, 'Ваш аккаунт не найден в системе.');
                return;
            }

            // Создание группы
            await GroupStud.create({
                GROUP_NAME: groupName,
                CREATOR_ID: user.USER_ID
            });

            bot.sendMessage(chatId, `Группа "${groupName}" отправлена на рассмотрение.`);
        } catch (error) {
            console.error('Ошибка при создании группы:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при создании группы.');
        }

        // Вернуть в главное меню после создания группы
        showMainMenu(chatId);
    });
};

// Функция для обработки заявок на создание групп
const handleGroupRequests = async (chatId) => {
    try {
		const telegramId = chatId;
        // Найти пользователя по TELEGRAM_ID
        const user = await Users.findOne({ where: { TELEGRAM_ID: telegramId } });

        if (!user) {
            bot.sendMessage(chatId, 'Ваш аккаунт не найден в системе.');
            return;
        }

        // Проверка на права администратора пользователя телеграм
        if (user.ROLE_GLOBAL === 'admin') {
            try {
                // Получаем заявки на создание групп и включаем пользователей
                const requests = await GroupStud.findAll({
                    where: { IS_APPROVED: false }
                });

                if (requests.length === 0) {
                    bot.sendMessage(chatId, 'У вас нет заявок на создание групп.');
					return;
                } else {
                    // Создание кнопок для каждой заявки
                    const keyboard = requests.map(request => [
                        { text: request.GROUP_NAME, callback_data: `group_${request.GROUP_ID}` }
                    ]);

                    keyboard.push([{ text: 'Назад', callback_data: 'back_to_requests' }]);

                    // Отправляем кнопки
                    bot.sendMessage(chatId, 'Выберите заявку для просмотра:', {
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    });
                }
            } catch (error) {
                console.error('Ошибка при получении заявок на создание групп:', error);
                bot.sendMessage(chatId, 'Произошла ошибка при получении заявок на создание групп.');
            }
        } else {
            bot.sendMessage(chatId, 'У вас нет прав для просмотра заявок на создание групп.');
            showMainMenu(chatId);
        }
    } catch (error) {
        console.error('Ошибка при проверке прав пользователя:', error);
        bot.sendMessage(chatId, 'Ошибка при проверке прав пользователя для доступа к заявкам.');
        showMainMenu(chatId);
    }
};

// Обработка нажатий на кнопки
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;
	console.log(action);
    if (action.startsWith('group_')) {
        const groupId = parseInt(action.replace('group_', ''));

            // Найти группу и включить ассоциированные данные
            const group = await GroupStud.findOne({
                where: { GROUP_ID: groupId },
                include: [{ model: Users, as: 'Creator' }]
            });

            if (group) {
                const creator = group.Creator || {};
                const creatorUsername = creator.USERNAME || 'Неизвестно';
                const creatorId = creator.USER_ID || 'Неизвестно';
                const createdAt = group.CREATED_AT || 'Неизвестно';

                bot.sendMessage(chatId, `Информация о группе:\n\nНазвание группы: ${group.GROUP_NAME}\nИмя создателя: ${creatorUsername}\nID создателя: ${creatorId}\nДата и время заявки: ${createdAt}`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Принять', callback_data: `accept_group_${groupId}` }],
                            [{ text: 'Отклонить', callback_data: `reject_group_${groupId}` }],
                            [{ text: 'Назад', callback_data: 'back_to_requests' }]
                        ]
                    }
                });
            } else {
                bot.sendMessage(chatId, 'Группа не найдена.');
            }

    } 
	else if (action === 'back_to_requests') {
        // Вызов функции для отображения списка заявок на создание групп
        await handleGroupRequests(chatId);
    } 
	else if (action.startsWith('accept_group_')) {
        const groupId = parseInt(action.replace('accept_group_', ''));

        try {
            // Проверить, существует ли создатель группы
            const group = await GroupStud.findOne({ where: { GROUP_ID: groupId } });
            if (!group) {
                bot.sendMessage(chatId, 'Группа не найдена.');
                return;
            }

            const userExists = await Users.findOne({ where: { USER_ID: group.CREATOR_ID } });
            if (!userExists) {
                bot.sendMessage(chatId, 'Создатель группы не найден.');
                return;
            }

            // Обновить статус группы и создать запись в USER_GROUPS для создателя
            await GroupStud.update({ IS_APPROVED: true }, { where: { GROUP_ID: groupId } });

            await UserGroups.create({
                USER_ID: userExists.USER_ID,
                GROUP_ID: groupId,
                ROLE: 'curator'
            });
			
			// Для создателя сделать заявку в GroupRequests, что она подтверждена
			await GroupRequests.create({
				GROUP_NAME: group.GROUP_NAME,
				REQUESTER_ID: userExists.USER_ID,
				IS_APPROVED: true
			});
			

            bot.sendMessage(chatId, 'Заявка на создание группы принята.\nСоздатель заявки стал куратором группы');
        } catch (error) {
            console.error('Ошибка при принятии группы:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при принятии группы.');
        }
    } 
	else if (action.startsWith('reject_group_')) {
        const groupId = parseInt(action.replace('reject_group_', ''));
        try {
            // Удалить заявку на создание группы
            await GroupStud.destroy({ where: { GROUP_ID: groupId } });
            bot.sendMessage(chatId, 'Заявка на создание группы отклонена.');
        } catch (error) {
            console.error('Ошибка при отклонении группы:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при отклонении группы.');
        }
    } 
	else if (action.startsWith('approved_group_')) { 
		//Была выбрана конкретная учебная группа для подачи заявки
		 const groupId = parseInt(action.replace('approved_group_', ''));
		 const group = await GroupStud.findOne({where: {GROUP_ID: groupId}});
		 if (group) {
			 try {
				 bot.sendMessage(chatId, `Подача заявки на вход в группу`, {
                    //Предлагается подать заявку на вход в группу
					reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Отправить заявку', callback_data: `enter_group_${groupId}` }],
							[{ text: 'Посмотреть участников', callback_data: `get_info_${groupId}` }],
                            [{ text: 'Назад', callback_data: 'back_main' }]
                        ]
                    }
                });
				 
			 } catch (error) {
				 console.log('Ошибка при обработке учебной группы');
				 bot.sendMessage(chatId, 'Ошибка при обработке учебной группы');
			 }
		 } else {
			 bot.sendMessage(chatId, 'Группы не найдено');
			 showMainMenu(chatId);
			 return;
		 }
	} 
	else if (action === 'back_main') {
		showMainMenu(chatId);
		return;
	} 
	else if (action.startsWith('enter_group_')) {
		try {
        const groupId = parseInt(action.replace('enter_group_', ''));
        const findDbId = await Users.findOne({ where: { TELEGRAM_ID: chatId } });
        const findGroupNameById = await GroupStud.findOne({ where: { GROUP_ID: groupId } });

        if (!findDbId) {
            throw new Error(`User with TELEGRAM_ID ${chatId} not found`);
        }
        if (!findGroupNameById) {
            throw new Error(`Group with GROUP_ID ${groupId} not found`);
        }

        const GR = await GroupRequests.findOne({
            where: {
                REQUESTER_ID: findDbId.USER_ID,
                GROUP_NAME: findGroupNameById.GROUP_NAME
            }
        });

        console.log(`Найден пользователь: ${findDbId.USER_ID}, GROUP_NAME: ${findGroupNameById.GROUP_NAME}`);

        if (!GR) {
            // Заявка не найдена, создаем новую
            await GroupRequests.create({
                REQUESTER_ID: findDbId.USER_ID,
                GROUP_NAME: findGroupNameById.GROUP_NAME,
            });
            bot.sendMessage(chatId, 'Заявка успешно подана, ожидайте.');
        } else {
            // Заявка уже существует
            bot.sendMessage(chatId, 'Вы уже подавали заявку на вступление в эту группу');
        }
        showMainMenu(chatId);
    } catch (error) {
        console.error('Ошибка при поиске группы и человека при подаче заявки:', error);
        bot.sendMessage(chatId, 'Ошибка при поиске пользователя или группы');
        showMainMenu(chatId);
    }
	}
	else if (action.startsWith('get_info_')) {
		try {
			const checkRights = await Users.findOne({where: {TELEGRAM_ID: chatId}});
			if (!checkRights)
			{
				bot.sendMessage(chatId, 'Зарегистрируйтесь перед просмотром участников (/start)');
			} else {
				if (checkRights.ROLE_GLOBAL === 'admin') {
					const groupId = parseInt(action.replace('get_info_', ''));
					const getList = await UserGroups.findAll({where: {GROUP_ID: groupId}});
					
					if(!getList)
					{
						bot.sendMessage(chatId, 'Участники данной группы не найдены');
						showMainMenu(chatId);
					} else {
						
						const keyboard = getList.map(request => [
    { text: `${request.USER_ID} - ${request.ROLE}`, callback_data: `change_role_${request.USER_ID}_${request.GROUP_ID}` }
]);
			
						keyboard.push([{ text: 'Назад', callback_data: 'back_main' }]);
						// Отправляем кнопки
						bot.sendMessage(chatId, 'Выберите участника:', {
							reply_markup: {
								inline_keyboard: keyboard
							}
						});
						
					}
					
				} else {
					bot.sendMessage(chatId, 'У вас недостаточно прав для просмотра списка участников!');
					showMainMenu(chatId);
				}
			}
		} catch (error) {
			console.log('Ошибка при просмотре участников группы');
			bot.sendMessage(chatId, 'Ошибка при просмотре участников группы');
		}
	} 
	else if (action.startsWith('change_role_')) {
		const act = action.replace('change_role_', '');
		console.log('act: ' + act);
		const userId = parseInt(act.split('_')[0]);
		const groupId = parseInt(act.split('_')[1]);
		console.log('UserID: ' + userId + ' GroupId: ' + groupId);
		try {
			if (groupId && userId) {
			 try {
				 bot.sendMessage(chatId, `Выберите роль пользователя:`, {
    reply_markup: {
        inline_keyboard: [
            [{ text: 'Сделать администратором', callback_data: `make_admin_${groupId}_${userId}` }],
            [{ text: 'Сделать куратором', callback_data: `make_curator_${groupId}_${userId}` }],
            [{ text: 'Сделать студентом', callback_data: `make_student_${groupId}_${userId}` }],
            [{ text: 'Назад', callback_data: 'back_main' }]
        ]
    }
});
				 
			 } catch (error) {
				 console.log('Ошибка при обработке учебной группы');
				 bot.sendMessage(chatId, 'Ошибка при обработке учебной группы');
			 }
		 } else {
			 bot.sendMessage(chatId, 'Группы не найдено');
			 showMainMenu(chatId);
			 return;
		 }
		} catch (error) {
			
		}
	}
	else if (action.startsWith('make_')) {
		
		if (action.startsWith('make_admin_')) {
			let act = action.replace('make_admin_', '');
			console.log('act: ' + act);
		const userId = parseInt(act.split('_')[0]);
		const groupId = parseInt(act.split('_')[1]); 
		console.log('UserID: ' + userId + ' GroupId: ' + groupId);
			try {
				await UserGroups.update({ROLE: 'admin'}, {where: {USER_ID: userId, GROUP_ID: groupId}});
				bot.sendMessage(chatId, 'Успешная выдача прав Администратора');
			} catch (error) {
				bot.sendMessage(chatId, 'Неудачная выдача прав пользователю');
				showMainMenu(chatId);
			}
		} 
		else if (action.startsWith('make_curator_')) {
			let act = action.replace('make_curator_', '');
			console.log('act: ' + act);
		const userId = parseInt(act.split('_')[0]);
		const groupId = parseInt(act.split('_')[1]);
		console.log('UserID: ' + userId + ' GroupId: ' + groupId);
			try {
				await UserGroups.update({ROLE: 'curator'}, {where: {USER_ID: userId, GROUP_ID: groupId}});
				bot.sendMessage(chatId, 'Успешная выдача прав Куратора');
			} catch (error) {
				bot.sendMessage(chatId, 'Неудачная выдача прав пользователю');
				showMainMenu(chatId);
			}
		} 
		else if (action.startsWith('make_student_')) {
			let act = action.replace('make_student_', '');
			console.log('act: ' + act);
		const userId = parseInt(act.split('_')[0]);
		const groupId = parseInt(act.split('_')[1]);
		console.log('UserID: ' + userId + ' GroupId: ' + groupId);
			try {
				await UserGroups.update({ROLE: 'student'}, {where: {USER_ID: userId, GROUP_ID: groupId}});
				bot.sendMessage(chatId, 'Успешная выдача прав Студента');
			} catch (error) {
				bot.sendMessage(chatId, 'Неудачная выдача прав пользователю');
				showMainMenu(chatId);
			}
		} else {
			bot.sendMessage(chatId, 'Неизвестная команда');
			showMainMenu(chatId);
		}
	}
	else if (action === 'show_all_events') {
        try {
            const currentDate = new Date().toISOString().split('T')[0]; // Получаем текущую дату в формате YYYY-MM-DD

			const events = await sequelize.query(
			'SELECT * FROM EVENTS WHERE EVENT_DATE >= :currentDate',
			{
				replacements: { currentDate },
				type: QueryTypes.SELECT
			});

            if (events.length === 0) {
                bot.sendMessage(chatId, 'Нет предстоящих мероприятий.');
            } else {
                const eventMessages = events.map(event => {
                    return `Название: ${event.EVENT_NAME}\nДата: ${event.EVENT_DATE}\nВремя: ${event.EVENT_TIME}\nМесто: ${event.LOCATION}\nОписание: ${event.DESCRIPTION}`;
                }).join('\n\n');

                bot.sendMessage(chatId, `Предстоящие мероприятия:\n\n${eventMessages}`);
            }
			showMainMenu(chatId);
			return;
        } catch (error) {
            console.error('Ошибка при получении мероприятий:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при получении мероприятий.');
			showMainMenu(chatId);
			return;
        }
    } 
	else if (action === 'create_event') {
        bot.sendMessage(chatId, 'Напишите в чате следующее:\n[Название мероприятия]\n[Дата проведения мероприятия]\n[Время проведения мероприятия]\n[Место проведения мероприятия]\n[Описание мероприятия]');
		bot.sendMessage(chatId, "Пример:\nСбор разработчиков приложений\n2024-12-31\n18:00:00\nГлавный зал\nСбор разработчиков для подведения итогов");
		bot.sendMessage(chatId, "Введите 'Назад' для возврата в главное меню");
        bot.once('message', async (msg) => {
			if (msg.text === 'Назад' || msg.text === 'назад')
			{
				showMainMenu(chatId);
				return;
			}
            const eventDetails = msg.text.split('\n');
			
			if (eventDetails.length !== 5) {
                bot.sendMessage(chatId, 'Неправильный формат данных. Попробуйте снова.');
                handleEvent(chatId);
                return;
            }

            const [eventName, eventDate, eventTime, location, description] = eventDetails;

            // Проверка формата даты и времени
            if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !/^\d{2}:\d{2}:\d{2}$/.test(eventTime)) {
                bot.sendMessage(chatId, 'Неправильный формат даты или времени. Попробуйте снова.\nПример:\nСбор разработчиков приложений\n2024-12-31\n18:00:00\nГлавный зал\nСбор разработчиков для подведения итогов');
                handleEvent(chatId);
                return;
            }

            const now = new Date();
            const eventDateTime = new Date(`${eventDate}T${eventTime}`);

            if (eventDateTime <= now) {
                bot.sendMessage(chatId, 'Дата и время мероприятия не могут быть в прошлом. Попробуйте снова.');
                handleEvent(chatId);
                return;
            }

            try {
                await Events.create({
                    EVENT_NAME: eventName,
                    EVENT_DATE: eventDate,
                    EVENT_TIME: eventTime,
                    LOCATION: location,
                    DESCRIPTION: description
                });

                bot.sendMessage(chatId, 'Мероприятие успешно создано.');
                showMainMenu(chatId);
				return;
            } catch (error) {
                console.error('Ошибка при создании мероприятия:', error);
                bot.sendMessage(chatId, 'Произошла ошибка при создании мероприятия.');
                handleEvent(chatId);
				return;
            }
			return;
        });
		return;
    } 
	else if (action === 'back_main') {
        showMainMenu(chatId);
		return;
    }
	else if (action.startsWith('show_group_menu_')) { // +
		const grId = parseInt(action.replace('show_group_menu_', ''));
		showGroupInfo(chatId, grId);
	} 
	else if (action.startsWith('show_schedule_')) { // -
		const grId = parseInt(action.replace('show_schedule', '')); //group id
		
	}
	else if (action.startsWith('actual_tasks_')) { // -
		const grId = parseInt(action.replace('actual_tasks_', '')); //group id
		const tasks = Tasks.findAll({where: {IS_COMPLETED: false}});
		
	}
	else if (action.startsWith('add_task_')) { // ?? -
		const grId = parseInt(action.replace('add_task_', '')); //group id
		bot.sendMessage(chatId, 'Введите информацию о вашей задаче, согласно шаблону:');
		bot.sendMessage(chatId, '[Заголовок задачи]\n[Описание задачи]\n[Дата дедлайна YYYY-MM-DD]');
		bot.sendMessage(chatId, 'Пример:\nЗакончить проект по математике\nЗакончить проект, связанный с докладом по математике\n2024-12-31');
		bot.sendMessage(chatId, 'Введите "Назад", чтобы вернуться обратно');
		bot.once('message', async (msg) => {
			if (msg.text === 'Назад' || msg.text === 'назад')
			{
				showGroupInfo(chatId, grId);
				return;
			}
            const eventDetails = msg.text.split('\n');
			
			if (eventDetails.length !== 3) {
                bot.sendMessage(chatId, 'Неправильный формат данных. Попробуйте снова.');
                showGroupInfo(chatId, grId);
                return;
            } else {
				try {
					const usr = Users.findOne({where: {TELEGRAM_ID: chatId}});
					if (!usr) {
						bot.sendMessage(chatId, 'Пользователь не найден');
					}
					const userId = parseInt(usr.USER_ID);
					// Проверка формата даты
					if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDetails[2])) {
						bot.sendMessage(chatId, 'Неправильный формат даты. Попробуйте снова.\nПример:\nЗакончить проект по математике\nЗакончить проект, связанный с докладом по математике\n2024-12-31');
					} else {
						await Tasks.create ({
							USER_ID: userId,
							TITLE: eventDetails[0],
							DESCRIPTION: eventDetails[1],
							DEADLINE: eventDetails[2]
						});
						console.log('Успешна задана задача с заголовком "' + eventDetails[0] + '", и содержанием "' + eventDetails[1] + '"');
						bot.sendMessage(chatId, 'Успешна задана задача с заголовком "' + eventDetails[0] + '", и содержанием "' + eventDetails[1] + '"');
					}
				} catch (error) {
					console.log('Ошибка при задании Task в таблицу Tasks');
					bot.sendMessage(chatId, 'Ошибка при создании задачи!');
				}
				showGroupInfo(chatId, grId);
				return;
			}
		});
		
	}
	else if (action.startsWith('add_subject_')) { // -
		const grId = parseInt(action.replace('add_subject_', '')); //group id
		bot.sendMessage(chatId, 'Введите название нового предмета (введите "Назад" чтобы вернуться): ');
		bot.once('message', async (msg) => {
			try {
			if (msg.text === 'Назад' || msg.text === 'назад') {
				showGroupInfo(chatIt, grId);
			} else {
				//Введено название предмета
				bot.sendMessage(chatId, 'Предмет: ' + msg.text);
				
			}
			} catch (error) {
				console.log('Ошибка при задании учебного предмета');
				bot.sendMessage(chatId, 'Ошибка при задании учебного предмета');
			}
		});
		showGroupInfo(chatId, grId);
		return;
	}
	else if (action.startsWith('requests_tasks_')) { // - ez
		const grId = parseInt(action.replace('requests_tasks_', '')); //group id
		
	}
	else if (action.startsWith('subject_list_')) { // - hard
		const grId = parseInt(action.replace('subject_list_', '')); //group id
		
	}
	else if (action.startsWith('requests_join_')) { // - ez
		const grId = parseInt(action.replace('requests_join_', '')); //group id
		
	}
	else if (action.startsWith('send_notification_')) { // - ez
		const grId = parseInt(action.replace('send_notification_', '')); //group id
		
	}
});

// Функция для обработки информации о моих группах
const handleMyGroupsInfo = async (chatId) => {
    const telegramId = chatId;
    const user = await Users.findOne({ where: { TELEGRAM_ID: telegramId } });

    if (!user) {
        bot.sendMessage(chatId, 'Ваш аккаунт не найден в системе.');
        return;
    }

    const userGroups = await UserGroups.findAll({ where: { USER_ID: user.USER_ID } });

    if (userGroups.length === 0) {
        bot.sendMessage(chatId, 'Вы не состоите ни в одной группе.');
        return;
    } else {
        // Создание кнопок для каждой группы
        const keyboard = [];
        for (const userGroup of userGroups) {
            const group = await GroupStud.findOne({ where: { GROUP_ID: userGroup.GROUP_ID } });
            if (group) {
                keyboard.push([{ text: group.GROUP_NAME, callback_data: `show_group_menu_${group.GROUP_ID}` }]);
            }
        }
        
        keyboard.push([{ text: 'Назад', callback_data: 'back_main' }]);

        // Отправляем кнопки
        bot.sendMessage(chatId, 'Список ваших учебных групп:', {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    }
};

// Функция для обработки заявки на вступление в группу
const handleJoinGroup = async (chatId) => {
    try {
        // Получаем список подтверждённых групп
        const requests = await GroupStud.findAll({
            where: { IS_APPROVED: true }
        });

        if (requests.length === 0) {
			bot.sendMessage(chatId, 'На данный момент учебных групп нет.');
			showMainMenu(chatId);
			return;
        } else {
			// Создание кнопок для каждой группы
            const keyboard = requests.map(request => [
                { text: request.GROUP_NAME, callback_data: `approved_group_${request.GROUP_ID}` }
            ]);
			
            keyboard.push([{ text: 'Назад', callback_data: 'back_main' }]);
            // Отправляем кнопки
            bot.sendMessage(chatId, 'Выберите учебную группу:', {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при получении списка учебных групп', error);
        bot.sendMessage(chatId, 'Произошла ошибка при получении списка учебных групп.');
		showMainMenu(chatId);
		return;
    }
};

// Функция для отправки уведомления о мероприятии
const sendNotificationEvent = async (userId, message) => {
    try {
        await bot.sendMessage(userId, message);
    } catch (error) {
        console.error('Ошибка при отправке уведомления:', error);
    }
};

// Функция для проверки и отправки уведомлений о мероприятиях
const checkAndSendNotificationsEvents = async (daysBefore) => {
    try {
	const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);

    // Форматируем дату в YYYY-MM-DD для сравнения
    const formattedDate = targetDate.toISOString().split('T')[0];

    // Получаем все мероприятия, которые состоятся через `daysBefore` дней
    const events = await Events.findAll({
        where: {
            EVENT_DATE: {
                [Op.eq]: formattedDate
            }
        }
    });

    // Получаем всех пользователей
    const users = await Users.findAll();

    // Отправляем уведомления каждому пользователю
    for (const event of events) {
        const message = `Напоминание о мероприятии: ${event.EVENT_NAME}\nДата: ${event.EVENT_DATE}\nВремя: ${event.EVENT_TIME}\nМесто: ${event.LOCATION}\nОписание: ${event.DESCRIPTION}`;

        for (const user of users) {
            await sendNotificationEvent(user.TELEGRAM_ID, message);
        }
    }
	} catch (error) {
		console.log('Ошибка при обработке списка мероприятий для рассылки');
	}
};

// cron-расписание для каждого мероприятия (7, 3, 2, 1 день до их начала)
cron.schedule('0 9 * * *', () => { // Выполняется каждый день в 0 минут, 9 часов.
	checkAndSendNotificationsEvents(7);
    checkAndSendNotificationsEvents(3);
    checkAndSendNotificationsEvents(2);
    checkAndSendNotificationsEvents(1);
});