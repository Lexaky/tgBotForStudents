const TelegramBot = require('node-telegram-bot-api');
const { Sequelize, DataTypes } = require('sequelize');
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
        defaultValue: null
    },
    SUBJECT_ID: {
        type: DataTypes.INTEGER
    },
    TITLE: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    DESCRIPTION: {
        type: DataTypes.TEXT
    },
    DEADLINE: {
        type: DataTypes.DATE
    },
    IS_COMPLETED: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    CREATED_AT: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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
        type: DataTypes.INTEGER
    },
    TASK_ID: {
        type: DataTypes.INTEGER
    },
    EVENT_ID: {
        type: DataTypes.INTEGER
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

//Необходимо добавить кнопку "Уведомления" в главное меню, которая доступна только администраторам
//Необходимо добавить кнопку "Создать мероприятие" в главное меню, которая доступна только администраторам

//Все нижеперечисленные действия осуществляются для функции handleMyGroupsInfo()
//Добавить меню для групп, в которые вступил пользователь. Для этого в каждой группе должно быть своё меню.
//В меню группы должны быть кнопки "Расписание занятий", "Актуальные задачи", "Создать учебный предмет" (только куратор),
//"Добавить задачу", "Добавить предмет в расписание", "Заявки на задачи" (только куратор), "Заявки на вступление в группу" (только куратор),
//"Список учебных предметов" с последующими кнопками удаления существующих предметов (только куратор), "Уведомения для группы" (только куратор).
//При нажатии на кнопку "Актуальные задачи" выводится список задач в виде кнопок, при нажатии на них выводится фулл описание задачи и
//кнопка "предложить группе", которая отправляет куратору запрос на вывод задачи группе, а не только пользователю + кнопка "Назад"



// Функция для отображения главного меню
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

const showGroupInfo = (chatId, groupId) => {
    bot.sendMessage(chatId, 'Главное меню группы', {
        reply_markup: {
            keyboard: [
                [{ text: 'Расписание занятий' }],
                [{ text: 'Актуальные задачи' }, { text: 'Добавить задачу' }],
                [{ text: 'Добавить учебный предмет' }, { text: 'Заявки на задачи для группы' }],
				[{ text: 'Список учебных предметов' }, {text: 'Заявки на вступление в группу'}],
				[{ text: 'Список учебных предметов' }, {text: 'Заявки на вступление в группу'}]
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
		
	} else if (text == 'Мероприятия')
});

// Функция для создания уведомлений для всех пользователей от админов
const handleNotification = async (chatId) => {
	
}

// Функция для вывода существующих мероприятий и создания мероприятий админами
const handleEvent = async (chatId) => {
	
}

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
	
});

// Функция для обработки информации о моих группах
const handleMyGroupsInfo = async (chatId) => {
    const telegramId = chatId;
	console.log(chatId);
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
        let message = 'Информация о ваших группах:\n';
        for (const userGroup of userGroups) {
            const group = GroupStud.findOne({ where: { GROUP_ID: userGroup.GROUP_ID } });
            message += `- ${group.GROUP_NAME}\n`;
        }
        bot.sendMessage(chatId, message);
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
    }
};

