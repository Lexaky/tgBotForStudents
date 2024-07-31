const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { sequelize, GroupStud, Users, Subjects, UserGroups, Tasks, Schedule, Events, Notifications, GroupRequests, UserStates } = require('./models');
const { Sequelize, DataTypes, QueryTypes, Op } = require('sequelize');
const { createCanvas } = require('canvas');
const fs = require('fs');
// Инициализация бота
const token = '7345012579:AAEpRCqweK2FLpRMfILGIf4Y9geDkpGdlHw';
const bot = new TelegramBot(token, { polling: true });

// Функция для установки состояния пользователя
const setState = async (telegramId, state, options = {}) => {
    const { groupId, eventId, userId, taskId, subjectId, groupName, requestId } = options;

    // Объект с новыми данными для обновления или создания
    const newState = {
        TELEGRAM_ID: telegramId,
        STATE: state,
        GROUP_ID: groupId || null,
        EVENT_ID: eventId || null,
        USER_ID: userId || null,
        TASK_ID: taskId || null,
        SUBJECT_ID: subjectId || null,
        GROUP_NAME: groupName || null,
        REQUEST_ID: requestId || null
    };

    // Проверка существования записи и обновление или создание новой
    const [userState, created] = await UserStates.findOrCreate({
        where: { TELEGRAM_ID: telegramId },
        defaults: newState
    });

    if (!created) {
        await UserStates.update(newState, { where: { TELEGRAM_ID: telegramId } });
    }
};

// Функция для получения состояния пользователя
const getState = async (telegramId) => {
    const userState = await UserStates.findOne({ where: { TELEGRAM_ID: telegramId } });
    return userState ? userState.STATE : null;
};

// Функция для получения параметров состояния пользователя (возвращение объекта состояния)
const getFullState = async (telegramId) => {
    const userState = await UserStates.findOne({ where: { TELEGRAM_ID: telegramId } });
    if (userState) {
        return userState;
    } else {
        return null;
    }
};

// Функция для отображения главного меню
const showMainMenu = (chatId) => {
	bot.sendMessage(chatId, 'Главное меню', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Добавить группу', callback_data: `create_group` }],
                [{ text: 'Группы, что ожидают добавление', callback_data: `requests_on_create_group` }, 
				{ text: 'Информация о моих группах', callback_data: `info_my_groups` }],
                [{ text: 'Вступить в группу', callback_data: `join_to_group` }],
                [{ text: 'Уведомления', callback_data: `notif` }, { text: 'Мероприятия', callback_data: `events` }]
            ]
        }
    });
};

const showGroupInfo = async (chatId, groupId) => {
	console.log('Открытие меню для группы с id: ' + groupId);
	try {
	const grName = await GroupStud.findOne({where: {GROUP_ID: groupId}});
	bot.sendMessage(chatId, 'Главное меню группы ' + grName.GROUP_NAME, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Расписание занятий', callback_data: `show_schedule_${groupId}` }, { text: 'Главное меню', callback_data: `back_main` }],
                [{ text: 'Задачи', callback_data: `actual_tasks_${groupId}` }, { text: 'Добавить задачу', callback_data: `add_task_${groupId}` }],
                [{ text: 'Добавить учебный предмет', callback_data: `add_subject_${groupId}` }, { text: 'Заявки на задачи для группы', callback_data: `requests_tasks_${groupId}` }],
				[{ text: 'Список учебных предметов', callback_data: `subject_list_${groupId}` }, { text: 'Заявки на вступление в группу', callback_data: `requests_join_${groupId}` }],
				[{ text: 'Отправить уведомление группе', callback_data: `send_notification_${groupId}` }, {text: 'Удалить предмет из расписания', callback_data: `delete_subject_from_schedule_${groupId}`}]
            ]
        }
    });
	} catch (error) {
		console.log('Ошибка при открытии меню группы');
		bot.sendMessage(chatId, 'Ошибка при открытии меню группы');
	}
};

// Обработка команды /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.username;
    const telegramId = msg.chat.id; // Получаем TELEGRAM_ID из chat.id
	await setState(telegramId, 'SLEEP');
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

// Обработка сообщений при разных состояниях
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
	const state = await getState(chatId);
	const currentState = await getFullState(chatId);
	switch (state) {
	case 'WAITING_FOR_GROUP_NAME':
			const groupName = text;
			const telegramId = msg.from.id;
		
			// Проверка, нажата ли кнопка "Назад"
			if (groupName === 'Назад') {
				showMainMenu(chatId); // Вернуть в главное меню
				await setState(chatId, 'SLEEP');
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
			await setState(chatId, 'SLEEP');
			return;
		}	
		
        try {
            // Найти пользователя по TELEGRAM_ID
            const user = await Users.findOne({ where: { TELEGRAM_ID: telegramId } });

            if (!user) {
                bot.sendMessage(chatId, 'Ваш аккаунт не найден в системе.');
                await setState(chatId, 'SLEEP');
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
		await setState(chatId, 'SLEEP');
		break;
			
			
	case 'CREATE_EVENT_STATE':
		if (msg.text === 'Назад' || msg.text === 'назад')
		{
			await setState(chatId, 'SLEEP');
			showMainMenu(chatId);
			return;
		}
        const eventDetails1 = msg.text.split('\n');
			
		if (eventDetails1.length !== 5) {
            bot.sendMessage(chatId, 'Неправильный формат данных. Попробуйте снова.');
            await setState(chatId, 'SLEEP');
			handleEvent(chatId);
            return;
        }

        const [eventName, eventDate, eventTime, location, description] = eventDetails1;

        // Проверка формата даты и времени
            if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !/^\d{2}:\d{2}:\d{2}$/.test(eventTime)) {
                bot.sendMessage(chatId, 'Неправильный формат даты или времени. Попробуйте снова.\nПример:\nСбор разработчиков приложений\n2024-12-31\n18:00:00\nГлавный зал\nСбор разработчиков для подведения итогов');
                await setState(chatId, 'SLEEP');
				handleEvent(chatId);
                return;
            }

            const now = new Date();
            const eventDateTime = new Date(`${eventDate}T${eventTime}`);

            if (eventDateTime <= now) {
                bot.sendMessage(chatId, 'Дата и время мероприятия не могут быть в прошлом. Попробуйте снова.');
                await setState(chatId, 'SLEEP');
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
                await setState(chatId, 'SLEEP');
				showMainMenu(chatId);
				return;
            } catch (error) {
                console.error('Ошибка при создании мероприятия:', error);
                bot.sendMessage(chatId, 'Произошла ошибка при создании мероприятия.');
                await setState(chatId, 'SLEEP');
				handleEvent(chatId);
				return;
            }
			await setState(chatId, 'SLEEP');
			break;
	
	case 'ADD_TASK_STATE':
		const userState = await getFullState(chatId);
        const grId = userState ? userState.GROUP_ID : null;
		console.log('Был найден GROUP_ID: ' + grId);
		if (msg.text === 'Назад' || msg.text.toLowerCase() === 'назад') {
            await setState(chatId, 'SLEEP');
			showGroupInfo(chatId, grId);
            return;
        }

        const eventDetails = msg.text.split('\n');
        
        if (eventDetails.length !== 3) {
            bot.sendMessage(chatId, 'Неправильный формат данных. Попробуйте снова.');
            await setState(chatId, 'SLEEP');
			showGroupInfo(chatId, grId);
            return;
        }

        try {
            const usr = await Users.findOne({ where: { TELEGRAM_ID: chatId } });
            if (!usr) {
                bot.sendMessage(chatId, 'Пользователь не найден');
                return;
            }

            const userId = usr.USER_ID;

            // Проверка формата даты
            if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDetails[2])) {
                bot.sendMessage(chatId, 'Неправильный формат даты. Попробуйте снова.\nПример:\nЗакончить проект по математике\nЗакончить проект, связанный с докладом по математике\n2024-12-31');
                return;
            }

            await Tasks.create({
                USER_ID: userId,
                GROUP_ID: grId, 
                TITLE: eventDetails[0],
                DESCRIPTION: eventDetails[1],
                DEADLINE: eventDetails[2]
            });

            console.log('Успешна задана задача с заголовком "' + eventDetails[0] + '", и содержанием "' + eventDetails[1] + '"');
            bot.sendMessage(chatId, 'Успешно задана задача с заголовком "' + eventDetails[0] + '", и содержанием "' + eventDetails[1] + '" пользователем ' + chatId);
        } catch (error) {
            console.log('Ошибка при задании Task в таблицу Tasks', error);
            bot.sendMessage(chatId, 'Ошибка при создании задачи!');
        }
		await setState(chatId, 'SLEEP');
        showGroupInfo(chatId, grId);
		break;
	case 'WAITING_ALARM_ALL':
		if (msg.text === 'Назад' || msg.text === 'назад') {
				await setState(chatId, 'SLEEP');
				showMainMenu(chatId);
				return;
			} else {
				const allUsers = await Users.findAll();
				for (usr of allUsers)
				{
					bot.sendMessage(usr.TELEGRAM_ID, msg.text);
				}
				bot.sendMessage(chatId, 'Все пользователи получили ваш текст');
			}
			await setState(chatId, 'SLEEP');
			handleNotification(chatId);
		break;
	case 'ALARM_USER_STATE':
            if (msg.text.toLowerCase() === 'назад') {
                await setState(chatId, 'SLEEP');
                showMainMenu(chatId);
            } else {
                const tgId = parseInt(msg.text);
                const usr = await Users.findOne({ where: { TELEGRAM_ID: tgId } });
                if (!usr) {
                    bot.sendMessage(chatId, 'Пользователь с таким ID не найден!');
                    await setState(chatId, 'SLEEP');
                    showMainMenu(chatId);
                } else {
                    bot.sendMessage(chatId, 'Пользователь найден, введите сообщение для него:');
                    await setState(chatId, 'ALARM_USER_STATE_2', { userId: usr.TELEGRAM_ID });
                }
            }
            break;

        case 'ALARM_USER_STATE_2':
            if (msg.text.toLowerCase() === 'назад') {
                await setState(chatId, 'SLEEP');
                showMainMenu(chatId);
            } else {
                const userId = currentState.USER_ID;
                if (userId) {
                    bot.sendMessage(userId, msg.text);
                    bot.sendMessage(chatId, `Сообщение "${msg.text}" отправлено пользователю ${userId}`);
                } else {
                    bot.sendMessage(chatId, 'Ошибка: не удалось получить ID пользователя.');
                }
                await setState(chatId, 'SLEEP');
                showMainMenu(chatId);
            }
            break;
	case 'ALARM_GROUP_STATE':
		if (msg.text.toLowerCase() === 'назад') {
				await setState(chatId, 'SLEEP');
				showMainMenu(chatId);
			} else {
				const gr = await GroupStud.findOne({where: {GROUP_NAME: msg.text}});
				if (!gr) {
					bot.sendMessage(chatId, 'Учебная группа с таким названием не найдена');
					await setState(chatId, 'SLEEP');
					showMainMenu(chatId);
				}
				else {
					bot.sendMessage(chatId, 'Учебная группа найдена, введите сообщение, которое нужно отправить участникам группы: ');
					await setState(chatId, 'ALARM_GROUP_STATE_2', {groupId: gr.GROUP_ID});
				}
			}
		break;
	case 'ALARM_GROUP_STATE_2':
		if (msg.text.toLowerCase() === 'назад') {
			await setState(chatId, 'SLEEP');
			showMainMenu(chatId);
		} else {
			const usrs = await UserGroups.findAll({where: {GROUP_ID: currentState.GROUP_ID}});
			for (us of usrs) {
				const tg = await Users.findOne({where: {USER_ID: us.USER_ID}});
				bot.sendMessage(tg.TELEGRAM_ID, msg.text);
			}
			bot.sendMessage(chatId, 'Сообщения успешно направлены участникам группы');
			await setState(chatId, 'SLEEP');
			showMainMenu(chatId);
		}
		break;
	case 'ADD_SUBJECT_STATE':
			try {
			if (msg.text.toLowerCase() === 'назад') {
				await setState(chatId, 'SLEEP');
				showGroupInfo(chatId, currentState.GROUP_ID);
			} else {
				//Введено название предмета
				bot.sendMessage(chatId, 'Предмет: ' + msg.text);
				Subjects.create({
					SUBJECT_NAME: msg.text,
					GROUP_ID: currentState.GROUP_ID,
					CREATOR_TELEGRAM_ID: chatId
				});
			}
			} catch (error) {
				console.log('Ошибка при задании учебного предмета');
				bot.sendMessage(chatId, 'Ошибка при задании учебного предмета');
			}
		await setState(chatId, 'SLEEP');
		showGroupInfo(chatId, currentState.GROUP_ID);
		break;
	case 'ADD_DATE_TIME_SUBJECT':
		try {
			if (msg.text.toLowerCase() === 'назад') {
				await setState(chatId, 'SLEEP');
				showGroupInfo(chatId, currentState.GROUP_ID);
			} else {
				const dateSplit = msg.text.split('\n')[0];
				const timeSplit = msg.text.split('\n')[1];
				if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSplit)) {
					bot.sendMessage(msg.chat.id, 'Неверный формат даты. Пожалуйста, используйте формат YYYY-MM-DD.');
					showGroupInfo(chatId, currentState.GROUP_ID);
					await setState(chatId, 'SLEEP');
					return;
				}

				// Проверка формата времени
				if (!/^\d{2}:\d{2}:\d{2}$/.test(timeSplit)) {
					bot.sendMessage(msg.chat.id, 'Неверный формат времени. Пожалуйста, используйте формат HH:MM:SS.');
					showGroupInfo(chatId, currentState.GROUP_ID);
					await setState(chatId, 'SLEEP');
					return;
				}

				// Дополнительная проверка на существование даты и времени
				const [year, month, day] = dateSplit.split('-').map(Number);
				const [hour, minute, second] = timeSplit.split(':').map(Number);

				// Проверка на существование даты
				const date = new Date(year, month - 1, day);
				if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
					bot.sendMessage(msg.chat.id, 'Введена несуществующая дата.');
					showGroupInfo(chatId, currentState.GROUP_ID);
					await setState(chatId, 'SLEEP');
					return;
				}

				// Проверка на корректность времени
				if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
					bot.sendMessage(msg.chat.id, 'Введено некорректное время.');
					showGroupInfo(chatId, currentState.GROUP_ID);
					await setState(chatId, 'SLEEP');
					return;
				}
				
				try {
					await Schedule.create({
						GROUP_ID: currentState.GROUP_ID,
						SUBJECT_ID: currentState.SUBJECT_ID,
						LESSON_DATE: dateSplit, // дата в формате YYYY-MM-DD
						LESSON_TIME: timeSplit  // время в формате HH:MM:SS
					});
					bot.sendMessage(chatId, 'Расписание обновлено!');
					showGroupInfo(chatId, currentState.GROUP_ID);
					await setState(chatId, 'SLEEP');
				} catch (error) {
					console.error('Ошибка при добавлении записи в расписание:', error);
					bot.sendMessage(msg.chat.id, 'Произошла ошибка при добавлении записи в расписание. В это время уже стоит другой предмет!');
					showGroupInfo(chatId, currentState.GROUP_ID);
					await setState(chatId, 'SLEEP');
				}
				
			}
		} catch (error) {
			bot.sendMessage(msg.chat.id, 'Неверный формат даты. Пожалуйста, используйте формат YYYY-MM-DD.');
			showGroupInfo(currentState.GROUP_ID);
			await setState(chatId, 'SLEEP');
		}
		await setState(chatId, 'SLEEP');
	break;
	case 'GROUP_NOTIFICATE':
		if (msg.text === 'Назад' || msg.text === 'назад') {
		showGroupInfo(chatId, currentState.GROUP_ID);
			} else {
				const joiners = await UserGroups.findAll({where: {GROUP_ID: currentState.GROUP_ID}});
				if (joiners.length === 0) {
					bot.sendMessage(chatId, 'Пользователей в данной группе не найдено');
				} else {
					for (joins of joiners) {
						const u = await Users.findOne({where: {USER_ID: joins.USER_ID}});
						bot.sendMessage(u.TELEGRAM_ID, msg.text);
					}
				bot.sendMessage(chatId, 'Сообщения успешно отправлены всем участникам группы');
				}
			await setState(chatId, 'SLEEP');
			showGroupInfo(chatId, currentState.GROUP_ID);
		}
	break;
	case 'DEL_DATE_TIME_SUBJECT':
		try {
    if (msg.text.toLowerCase() === 'назад') {
        await setState(chatId, 'SLEEP');
        showGroupInfo(chatId, currentState.GROUP_ID);
    } else {
        if (msg.text.split('\n').length === 3) {
            const groupIdGo = currentState.GROUP_ID;
			console.log('GROUP_ID IN STATE DEL_DATE_TIME_SUBJECT: ' + groupIdGo + ';;; chatId: ' + chatId);
			const dateSplit = msg.text.split('\n')[0];
            const timeSplit = msg.text.split('\n')[1];
            const dataPlsWork = msg.text.split('\n')[0];
			const subjNameToFind = msg.text.split('\n')[2];
            const subjTryFind = await Subjects.findOne({ where: { SUBJECT_NAME: subjNameToFind, GROUP_ID: currentState.GROUP_ID } });
            if (!subjTryFind)
			{
				bot.sendMessage(chatId, 'Введённый учебный предмет не найден, проверьте корректность написания!');
				await showGroupInfo(chatId, currentState.GROUP_ID);
				await setState(chatId, 'SLEEP');
				return;
			}
			const subjIdToDelete = subjTryFind.SUBJECT_ID;

            console.log('БЫЛИ ВВЕДЕНЫ ДАННЫЕ ДЛЯ УДАЛЕНИЯ ПРЕДМЕТА: ' + dateSplit + ' - ' + timeSplit + ' - ' + subjNameToFind + ' - ' + subjIdToDelete);

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSplit)) {
                bot.sendMessage(msg.chat.id, 'Неверный формат даты. Пожалуйста, используйте формат YYYY-MM-DD.');
                await showGroupInfo(chatId, currentState.GROUP_ID);
                await setState(chatId, 'SLEEP');
                return;
            }

            if (!/^\d{2}:\d{2}:\d{2}$/.test(timeSplit)) {
                bot.sendMessage(msg.chat.id, 'Неверный формат времени. Пожалуйста, используйте формат HH:MM:SS.');
                await showGroupInfo(chatId, currentState.GROUP_ID);
                await setState(chatId, 'SLEEP');
                return;
            }

            const [year, month, day] = dateSplit.split('-').map(Number);
            const [hour, minute, second] = timeSplit.split(':').map(Number);
			
            const date = new Date(year, month - 1, day);
            if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
                bot.sendMessage(chatId, 'Введена несуществующая дата.');
                await showGroupInfo(chatId, currentState.GROUP_ID);
                await setState(chatId, 'SLEEP');
                return;
            }

            if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
                bot.sendMessage(msg.chat.id, 'Введено некорректное время.');
                await showGroupInfo(chatId, currentState.GROUP_ID);
                await setState(chatId, 'SLEEP');
                return;
            }

            try {
                const formattedDate = new Date(year, month - 1, day+2, 1, 0, 0).toISOString().split('T')[0];
                const formattedTime = timeSplit.length === 5 ? timeSplit + ':00' : timeSplit;
                console.log('Удаление записи с параметрами:', {
                    GROUP_ID: currentState.GROUP_ID,
                    SUBJECT_ID: subjIdToDelete,
                    LESSON_DATE: formattedDate,
                    LESSON_TIME: formattedTime
                });
				const allObjectsFromSchedule = await Schedule.findAll({
					where: { GROUP_ID: currentState.GROUP_ID, SUBJECT_ID: subjIdToDelete, LESSON_TIME: timeSplit }
				});

				for (const aofs of allObjectsFromSchedule) {
					console.log(aofs.GROUP_ID + ' - ' + aofs.SUBJECT_ID + ' - ' + aofs.LESSON_DATE + ' - ' + aofs.LESSON_TIME);
					const date2 = new Date(aofs.LESSON_DATE);
					const year2 = date2.getFullYear();
					const month2 = String(date2.getMonth() + 1).padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
					const day2 = String(date2.getDate()).padStart(2, '0');
					const i = `${year2}-${month2}-${day2}`;

					if (i === dateSplit) {
						try {
							// Удаление объекта aofs из Schedule
							await aofs.destroy();
							console.log(`Запись с ID ${aofs.id} успешно удалена`);
							bot.sendMessage(chatId, 'Запись успешно удалена');
						} catch (error) {
							console.error('Ошибка при удалении записи:', error);
							bot.sendMessage(chatId, 'Произошла ошибка при удалении записи из расписания');
						}
					}
				}
				
                await showGroupInfo(chatId, currentState.GROUP_ID);
                await setState(chatId, 'SLEEP');
            } catch (error) {
                console.error('Ошибка при удалении записи из расписания:', error);
                bot.sendMessage(msg.chat.id, 'Произошла ошибка при удалении предмета из расписания');
                await showGroupInfo(chatId, currentState.GROUP_ID);
                await setState(chatId, 'SLEEP');
            }
        } else {
            bot.sendMessage(chatId, 'Неправильный формат данных');
            await showGroupInfo(chatId, currentState.GROUP_ID);
            await setState(chatId, 'SLEEP');
        }
    }
} catch (error) {
	bot.sendMessage(msg.chat.id, 'Неверный формат даты. Пожалуйста, используйте формат YYYY-MM-DD.');
	console.log('ОПИСАНИЕ ОШИБКИ: ' + error);
	await showGroupInfo(chatId, currentState.GROUP_ID);
    await setState(chatId, 'SLEEP');
}
	break;
	
	default: //nothing
	}
    
});

// Функция для создания уведомлений для всех пользователей от админов
const handleNotification = async (chatId) => {
	const usr = await Users.findOne({where: {TELEGRAM_ID: chatId}});
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
	return;
};

// Функция для вывода существующих мероприятий и создания мероприятий админами (?+)
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
            bot.sendMessage(chatId, 'Выберите действие:', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Показать все мероприятия', callback_data: 'show_all_events' }],
                        [{ text: 'Назад', callback_data: 'back_main' }]
                    ]
                }
            });
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

const handleCreateGroup = async (chatId) => {
    // Запрос названия группы
    bot.sendMessage(chatId, 'Введите название группы, которую хотите создать:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Назад', callback_data: `back_main` }] // Кнопка "Назад"
            ],
            one_time_keyboard: true
        }
    });

    // Обработка сообщения
	try {
	await setState(chatId, 'WAITING_FOR_GROUP_NAME');
	} catch (error) {
		bot.sendMessage(chatId, 'Ошибка состояний (Создание группы)');
		showMainMenu(chatId);
		console.log(error);
	}
};

// Функция для обработки заявок на создание групп +
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
                // Получаю заявки на создание групп и включаем пользователей
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

                    keyboard.push([{ text: 'Назад', callback_data: 'back_main' }]);

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

// Функция для вывода меню при создании групп
const handleGroupRequestsMenu = async (chatId, groupId) => {
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
};

// Функция для принятия заявки на создание группы
const handleAcceptGroupRequest = async (chatId, groupId) => {
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
};

// Функция для отклонения заявки на создание группы
const handleRejectGroupRequest = async (chatId, groupId) => {
	try {
            // Удалить заявку на создание группы
            await GroupStud.destroy({ where: { GROUP_ID: groupId } });
            bot.sendMessage(chatId, 'Заявка на создание группы отклонена.');
        } catch (error) {
            console.error('Ошибка при отклонении группы:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при отклонении группы.');
        }
};

// Функция для отображения учебных групп, подтверждённых админов, а также функций вступления в них
const handleApprovedGroups = async (chatId, groupId) => {
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
};

//Здесь логика отправки заявки на вступление в группу
const handleEnterGroup = async (chatId, groupId) => {
	try {
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
            if (findDbId.ROLE_GLOBAL === 'admin') {
				//Пользователь админ, автовход
				await GroupRequests.create({
					REQUESTER_ID: findDbId.USER_ID,
					GROUP_NAME: findGroupNameById.GROUP_NAME,
					IS_APPROVED: true,
				});
				
				await UserGroups.create({
					USER_ID: findDbId.USER_ID,
					GROUP_ID: groupId,
					ROLE: 'admin'
				});
				bot.sendMessage(chatId, 'Вы успешно вступили в группу!');
				
			} else {
			
			await GroupRequests.create({
                REQUESTER_ID: findDbId.USER_ID,
                GROUP_NAME: findGroupNameById.GROUP_NAME,
            });
            bot.sendMessage(chatId, 'Заявка успешно подана, ожидайте.');
			}
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
};

const handleGetInfoAboutGroup = async (chatId, groupId) => {
	try {
        const checkRights = await Users.findOne({ where: { TELEGRAM_ID: chatId } });
        if (!checkRights) {
            bot.sendMessage(chatId, 'Зарегистрируйтесь перед просмотром участников (/start)');
        } else {
            if (checkRights.ROLE_GLOBAL === 'admin') {
                const getList = await UserGroups.findAll({ where: { GROUP_ID: groupId } });

                if (!getList.length) {
                    bot.sendMessage(chatId, 'Участники данной группы не найдены');
                    showMainMenu(chatId);
                } else {
                    const userPromises = getList.map(async request => {
                        const user = await Users.findOne({ where: { USER_ID: request.USER_ID } });
                        return {
                            USERNAME: user.USERNAME,
                            ROLE: request.ROLE,
                            USER_ID: request.USER_ID,
                            GROUP_ID: request.GROUP_ID
                        };
                    });

                    const users = await Promise.all(userPromises);

                    const keyboard = users.map(user => [
                        { text: `${user.USERNAME} - ${user.ROLE}`, callback_data: `change_role_${user.USER_ID}_${user.GROUP_ID}` }
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
        console.log('Ошибка при просмотре участников группы: ' + error);
        bot.sendMessage(chatId, 'Ошибка при просмотре участников группы');
    }
};

const handleChangeRole = async (chatId, groupId, userId) => {
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
			console.log('Ошибка при изменении роли пользователя: ' + error);
		}
};

const handleChangeUserRole = async (action, chatId) => {
if (action.startsWith('make_admin_')) {
			let act = action.replace('make_admin_', '');
			console.log('act: ' + act);
		const userId = parseInt(act.split('_')[1]);
		const groupId = parseInt(act.split('_')[0]); 
		console.log('UserID: ' + userId + ' GroupId: ' + groupId + ' получил права администратора');
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
		const userId = parseInt(act.split('_')[1]);
		const groupId = parseInt(act.split('_')[0]);
		console.log('UserID: ' + userId + ' GroupId: ' + groupId + ' получил права куратора');
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
		const userId = parseInt(act.split('_')[1]);
		const groupId = parseInt(act.split('_')[0]);
		console.log('UserID: ' + userId + ' GroupId: ' + groupId + ' получил права студента');
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
};	

const handleShowAllEvents = async (chatId) => {
    try {
        const currentDate = new Date().toISOString().split('T')[0]; // Получаем текущую дату в формате YYYY-MM-DD

        // Получаем информацию о пользователе
        const user = await Users.findOne({ where: { TELEGRAM_ID: chatId } });

        if (!user) {
            bot.sendMessage(chatId, 'Ваш аккаунт не найден в системе.');
            showMainMenu(chatId);
            return;
        }

        const isAdmin = user.ROLE_GLOBAL === 'admin';

        // Получаем мероприятия
        const events = await sequelize.query(
            'SELECT * FROM EVENTS WHERE EVENT_DATE >= :currentDate',
            {
                replacements: { currentDate },
                type: QueryTypes.SELECT
            }
        );

        if (events.length === 0) {
            bot.sendMessage(chatId, 'Нет предстоящих мероприятий.');
        } else {
            if (isAdmin) {
                // Формируем клавиатуру с кнопками для администраторов
                const inlineKeyboard = events.map(event => [
                    {
                        text: `Название: ${event.EVENT_NAME}\nДата: ${event.EVENT_DATE}\nВремя: ${event.EVENT_TIME}\nМесто: ${event.LOCATION}\nОписание: ${event.DESCRIPTION}`,
                        callback_data: `show_event_${event.EVENT_ID}`
                    },
                    {
                        text: 'Удалить',
                        callback_data: `delete_event_${event.EVENT_ID}`
                    }
                ]);

                bot.sendMessage(chatId, 'Предстоящие мероприятия:', {
                    reply_markup: {
                        inline_keyboard: inlineKeyboard
                    }
                });
            } else {
                // Выводим описание мероприятий для обычных пользователей
                let message = 'Предстоящие мероприятия:\n\n';
                events.forEach(event => {
                    message += `Название: ${event.EVENT_NAME}\nДата: ${event.EVENT_DATE}\nВремя: ${event.EVENT_TIME}\nМесто: ${event.LOCATION}\nОписание: ${event.DESCRIPTION}\n\n`;
                });
                bot.sendMessage(chatId, message);
            }
        }
        showMainMenu(chatId);
    } catch (error) {
        console.error('Ошибка при получении мероприятий:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при получении мероприятий.');
        showMainMenu(chatId);
    }
};

//Введено состояние, проверить
const handleCreateEvent = async (chatId) => {
	bot.sendMessage(chatId, 'Напишите в чате следующее:\n[Название мероприятия]\n[Дата проведения мероприятия]\n[Время проведения мероприятия]\n[Место проведения мероприятия]\n[Описание мероприятия]');
	bot.sendMessage(chatId, "Пример:\nСбор разработчиков приложений\n2024-12-31\n18:00:00\nГлавный зал\nСбор разработчиков для подведения итогов");
	bot.sendMessage(chatId, "Введите 'Назад' для возврата в главное меню");
    await setState(chatId, 'CREATE_EVENT_STATE');
};

const handleShowSchedule = async (chatId, grId) => {
	console.log(grId);
	const today = new Date();
		try {
		// Выполняем запрос
		const findAllSubjectsInSchedule = await Schedule.findAll({
		  where: {
			GROUP_ID: grId,
			LESSON_DATE: {
			  [Op.gte]: today // Фильтруем по дате, оставляем только те записи, где LESSON_DATE >= сегодняшней даты
			}
		  },
		  order: [
			['LESSON_DATE', 'ASC'], // Сортируем по возрастанию LESSON_DATE
			['LESSON_TIME', 'ASC']  // Сортируем по возрастанию LESSON_TIME
		  ]
		});
		if (findAllSubjectsInSchedule.length === 0) 
		{
			bot.sendMessage(chatId, 'Ваше расписание ещё не составлено');
		} else {
			let finalText = 'Расписание занятий:\n';
			for (sub of findAllSubjectsInSchedule) {
				const subjectNameFinder = await Subjects.findOne({where: {SUBJECT_ID: sub.SUBJECT_ID}});
				const date2 = new Date(sub.LESSON_DATE);
					const year2 = date2.getFullYear();
					const month2 = String(date2.getMonth() + 1).padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
					const day2 = String(date2.getDate()).padStart(2, '0');
				finalText += year2 + '-' + month2 + '-' + day2 + ' - [' + sub.LESSON_TIME + ']\n  ' + subjectNameFinder.SUBJECT_NAME + '\n';
			}
			bot.sendMessage(chatId, finalText); // Вывод сначала в чате текстом, потом изображением
			// Создание изображения с текстом расписания
            const canvas = createCanvas(300, 1000);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height); // фон белый

            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            const lines = finalText.split('\n');
            let y = 30;
            for (const line of lines) {
                ctx.fillText(line, 10, y);
                y += 30;
            }

            // Сохранение изображения на диск
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync('./schedule.png', buffer);

            // Отправка изображения пользователю
            bot.sendPhoto(chatId, './schedule.png', { caption: 'Расписание учебных занятий' });
		}
		} catch (error) {
			console.log('Ошибка при поиске расписания группы');
			bot.sendMessage(chatId, 'Ошибка при поиске расписания группы');
		}
		showGroupInfo(chatId, grId);
		return;
};

const handleShowActualTasks = async (chatId, grId) => {
const userId = await Users.findOne({where: {TELEGRAM_ID: chatId}});
		if (!userId) {
			bot.sendMessage(chatId, 'Пользователь не найден!');
		}
		else {
			let finalListOfTasks = '';
			// Функция для создания и отправки изображения
			const createAndSendImage = async (text, caption) => {
				const canvas = createCanvas(800, 600); // Размеры
				const ctx = canvas.getContext('2d');
				ctx.fillStyle = 'white';
				ctx.fillRect(0, 0, canvas.width, canvas.height); // белый цвет фона

				ctx.fillStyle = 'black';
				ctx.font = '20px Arial';
				const lines = text.split('\n');
				let y = 30;
				for (const line of lines) {
					ctx.fillText(line, 10, y);
					y += 30;
				}

				// Сохранение изображения на диск
				const buffer = canvas.toBuffer('image/png');
				fs.writeFileSync('./tasks.png', buffer);

				// Отправка изображения пользователю с тг chatId и текстом caption
				bot.sendPhoto(chatId, './tasks.png', { caption });
			};
			
			let tasks = await Tasks.findAll({where: {IS_COMPLETED: false, USER_ID: userId.USER_ID, GROUP_ID: grId, FOR_ALL: false}, order: [['DEADLINE', 'ASC']]});
			if (tasks.length === 0) {
				bot.sendMessage(chatId, 'У вас отсутствуют личные задачи');
			} else {
				bot.sendMessage(chatId, 'Вывод вашего списка задач\n\n\nВывод вашего списка задач');
				
				for (tsk of tasks) {
					finalListOfTasks += 'Задача "' + tsk.TITLE + '"\n  ' + tsk.DESCRIPTION + '\n\n';
					bot.sendMessage(chatId, 'Задача "' + tsk.TITLE + '"\n  ' + tsk.DESCRIPTION + '\n', {
						reply_markup: {
							inline_keyboard: [
								[{text: 'Задача выполнена', callback_data: `complete_task_${tsk.TASK_ID}_${grId}`}],
								[{text: 'Отправить задачу группе', callback_data: `offer_task_to_group_${tsk.TASK_ID}_${grId}`}],
								[{text: 'Отменить предложение задачи группе', callback_data: `cancel_offer_task_to_group_${tsk.TASK_ID}_${grId}`}],
								[{text: 'Удалить задачу', callback_data: `delete_task_${tsk.TASK_ID}_${grId}`}],
								[{text: 'Назад', callback_data: `show_group_menu_${grId}`}]
							]
						}
					});
				}
				await createAndSendImage(finalListOfTasks, 'Личные задачи');
			}
			
			//Здесь весь текст задач хранится в переменной finalListOfTasks, нужно его вывести картинкой
			
			
			tasks = await Tasks.findAll({where: {FOR_ALL: true, IS_COMPLETED: false, GROUP_ID: grId}, order: [['DEADLINE', 'ASC']]});
			if (tasks.length === 0) { bot.sendMessage(chatId, 'Задачи для группы отсутствуют'); showGroupInfo(chatId, grId); return;} else {
			bot.sendMessage(chatId, 'Вывод списка задач группы\n\n\nВывод списка задач группы');
			finalListOfTasks = '';
			for (tsk of tasks) {
				finalListOfTasks += 'Задача "' + tsk.TITLE + '"\n  ' + tsk.DESCRIPTION + '\n\n';
				bot.sendMessage(chatId, 'Задача "' + tsk.TITLE + '"\n  ' + tsk.DESCRIPTION + '\n', {
					reply_markup: {
						inline_keyboard: [
							[{text: 'Удалить задачу (Нужны права куратора)', callback_data: `delete_task_${tsk.TASK_ID}_${grId}`}],
							[{text: 'Назад', callback_data: `show_group_menu_${grId}`}]
						]
					}
				});
			}
			
			//Здесь весь текст задач хранится в переменной finalListOfTasks, нужно его вывести повторно картинкой
			await createAndSendImage(finalListOfTasks, 'Задачи группы');
			}
		}
};

const handleDeleteTask = async (chatId, grId, tskId) => {
try {
        if (isNaN(tskId) || isNaN(grId)) {
            throw new Error('Некорректные значения taskId или groupId');
        }

        console.log('taskId:', tskId);
        console.log('groupId:', grId);

        const tsk = await Tasks.findOne({ where: { TASK_ID: tskId } });

        if (!tsk) {
            bot.sendMessage(chatId, 'Задача не найдена!');
        } else {
            const usr = await Users.findOne({ where: { TELEGRAM_ID: chatId } });

            if (!usr) {
                bot.sendMessage(chatId, 'Пользователь не найден!');
                return;
            }

            const usrGr = await UserGroups.findOne({ where: { USER_ID: usr.USER_ID, GROUP_ID: grId } });

            if (!usrGr) {
                bot.sendMessage(chatId, 'Вы не состоите в этой группе!');
                return;
            }

            if ((tsk.FOR_ALL === true && usrGr.ROLE !== 'student') || tsk.FOR_ALL === false) {
                await Tasks.destroy({ where: { TASK_ID: tskId } });
                bot.sendMessage(chatId, 'Задача удалена');
            } else {
                bot.sendMessage(chatId, 'У вас недостаточно прав для удаления задачи');
            }
        }

        showGroupInfo(chatId, grId);
    } catch (error) {
        console.error('Ошибка при удалении задачи:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при удалении задачи.');
    }
    return;
};

const handleCancelOfferTaskToGroup = async (chatId, grId, tskId) => {
	const tsk = await Tasks.findOne({where: {TASK_ID: tskId}});
	if (!tsk) {
			bot.sendMessage(chatId, 'Задача не найдена!');
		}
		else {
			await Tasks.update(
				{ IS_OFFER_FOR_ALL: false },
				{ where: { TASK_ID: tskId } }
			);
			bot.sendMessage(chatId, 'Задача видна только вам');
		}
	showGroupInfo(chatId, grId);
	return;
};

const handleOfferTaskToGroup = async (chatId, grId, tskId) => {
		const tsk = await Tasks.findOne({where: {TASK_ID: tskId}});
		if (!tsk) {
			bot.sendMessage(chatId, 'Задача не найдена!');
		}
		else {
			await Tasks.update({IS_OFFER_FOR_ALL: true}, {where: {TASK_ID: tskId}});
			bot.sendMessage(chatId, 'Заявка на задачу для группы отправлена');
		}
		showGroupInfo(chatId, grId);
		return;
};

const handleCompleteTask = async (chatId, grId, tskId) => {
	const tsk = await Tasks.findOne({where: {TASK_ID: tskId}});
		if (!tsk) {
			bot.sendMessage(chatId, 'Задача не найдена!');
		} 
		else {
			await Tasks.update({IS_COMPLETED: true}, {where: {TASK_ID: tskId}});
			bot.sendMessage(chatId, 'Задача выполнена!');
		}
		showGroupInfo(chatId, grId);
		return;
};

const handleAddTask = async (chatId, grId) => {
bot.sendMessage(chatId, 'Введите информацию о вашей задаче, согласно шаблону:');
    bot.sendMessage(chatId, '[Заголовок задачи]\n[Описание задачи]\n[Дата дедлайна YYYY-MM-DD]');
    bot.sendMessage(chatId, 'Пример:\nЗакончить проект по математике\nЗакончить проект, связанный с докладом по математике\n2024-12-31');
    bot.sendMessage(chatId, 'Введите "Назад", чтобы вернуться обратно');
	await setState(chatId, 'ADD_TASK_STATE', { groupId: grId });
};

const handleAddSubject = async (chatId, grId) => {
	bot.sendMessage(chatId, 'Введите название нового предмета (введите "Назад" чтобы вернуться): ');
	await setState(chatId, 'ADD_SUBJECT_STATE', {groupId: grId});
};

const handleListRequestsTasks = async (chatId, grId) => {
    try {
        // Ожидание результата поиска пользователя
        const usr = await Users.findOne({ where: { TELEGRAM_ID: chatId } });
        
        if (!usr) {
            // Пользователь не найден
            bot.sendMessage(chatId, 'Пользователь не найден в БД');
            return;
        }

        // Ожидание результата поиска роли пользователя в группе
        const findRole = await UserGroups.findOne({ where: { USER_ID: usr.USER_ID, GROUP_ID: grId } });

        if (!findRole) {
            // Роль пользователя в группе не найдена
            bot.sendMessage(chatId, 'Роль пользователя в группе не найдена');
            return;
        }

        // Проверка роли пользователя
        if (findRole.ROLE !== 'student') {
            // Получение задач, которые предлагаются для всех, но не для всех
            const requests = await Tasks.findAll({ where: { IS_OFFER_FOR_ALL: true, FOR_ALL: false } });

            if (requests.length === 0) {
                bot.sendMessage(chatId, 'Нет заявок на задачи для группы');
            } else {
                // Отправка сообщений с задачами
                for (const req of requests) {
                    bot.sendMessage(chatId, `Задача "${req.TITLE}"\n${req.DESCRIPTION}\n`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Принять задачу', callback_data: `approve_request_task_${req.TASK_ID}_${grId}` }],
                                [{ text: 'Отклонить задачу', callback_data: `reject_request_task_${req.TASK_ID}_${grId}` }],
                                [{ text: 'Назад', callback_data: `show_group_menu_${grId}` }]
                            ]
                        }
                    });
                }
            }
        } else {
            bot.sendMessage(chatId, 'У вас недостаточно прав для просмотра заявок задач');
        }
    } catch (error) {
        console.error('Ошибка при обработке запросов задач:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при обработке запросов задач.');
    }
};

const handleRejectTaskFromList = async (chatId, grId, tskId) => {
const tsk = await Tasks.findOne({where: {TASK_ID: tskId}});
		if (!tsk) {
			bot.sendMessage(chatId, 'Задача не найдена');
		} 
		else {
			await Tasks.update({FOR_ALL: false, IS_OFFER_FOR_ALL: false}, {where: {TASK_ID: tskId}});
			bot.sendMessage(chatId, 'Задача была отклонена');
		}
		showGroupInfo(chatId, grId);
		return;
};

const handleApproveTaskFromList = async (chatId, grId, tskId) => {
const tsk = await Tasks.findOne({where: {TASK_ID: tskId}});
		if (!tsk) {
			bot.sendMessage(chatId, 'Задача не найдена');
		} 
		else {
			await Tasks.update({FOR_ALL: true}, {where: {TASK_ID: tskId}});
			bot.sendMessage(chatId, 'Задача была закреплена для группы');
		}
		showGroupInfo(chatId, grId);
		return;
};

//Список предметов
const handleSubjectList = async (chatId, grId) => {
	const allSubjects = await Subjects.findAll({where: {GROUP_ID: grId}});
	try {
	if (allSubjects.length === 0) {
		bot.sendMessage(chatId, 'У вас нет предметов');
	}
	else {
		const userId = await Users.findOne({where: {TELEGRAM_ID: chatId}});
		const usr = await UserGroups.findOne({where: {USER_ID: userId.USER_ID, GROUP_ID: grId}});
		if (usr.ROLE !== 'student') {
            const keyboard = allSubjects.map(subject => [
                { text: subject.SUBJECT_NAME, callback_data: `go_to_subject_menu_${subject.SUBJECT_ID}_${grId}` }
            ]);
            keyboard.push([{ text: 'Назад', callback_data: `show_group_menu_${grId}` }]);

            // Вывод кнопок с предметами
            bot.sendMessage(chatId, 'Список предметов:', {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
		} else {
			bot.sendMessage(chatId, 'Недостаточно прав для просмотра списка');
			showGroupInfo(grId);
		}
	}
	} catch (error) {
		bot.sendMessage(chatId, 'Ошибка при выводе предметов');
		console.log('Ошибка при выводе предметов: ' + error);
	}
};


const handleSubjectMenu = async (chatId, subjId, groupId) => {
    try {
        // Находим предмет по ID
        const subject = await Subjects.findOne({ where: { SUBJECT_ID: subjId } });

        // Проверяем, найден ли предмет
        if (!subject) {
            bot.sendMessage(chatId, 'Предмет не найден.');
            return;
        }

        // Отправляем сообщение с клавиатурой
        bot.sendMessage(chatId, 'Выберите действие с предметом ' + subject.SUBJECT_NAME + ':', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Добавить в расписание', callback_data: `add_in_schedule_${groupId}_${subjId}` }],
                    [{ text: 'Удалить предмет', callback_data: `delete_subject_${groupId}_${subjId}` }],
                    [{ text: 'Назад', callback_data: `show_group_menu_${groupId}` }]
                ],
                one_time_keyboard: false // inline_keyboard не поддерживает one_time_keyboard
            }
        });
    } catch (error) {
        console.error('Ошибка при обработке меню предмета:', error);
        bot.sendMessage(chatId, 'Ошибка при обработке меню предмета.');
    }
};

const handleRequestsJoin = async (chatId, groupId) => {
	try {
		const f1 = await Users.findOne({where: {TELEGRAM_ID: chatId}});
		const f2 = await UserGroups.findOne({where: {USER_ID: f1.USER_ID, GROUP_ID: groupId}});
		if (f2.ROLE === 'student') {
			bot.sendMessage(chatId, 'У вас недостаточно прав для доступа к заявкам');
			await showGroupInfo(chatId, groupId);
			return;
		}
		
        const findGroupById = await GroupStud.findOne({ where: { GROUP_ID: groupId } });
        const requestsToGroup = await GroupRequests.findAll({ where: { GROUP_NAME: findGroupById.GROUP_NAME, IS_APPROVED: false } });
        
        if (requestsToGroup.length === 0) {
            bot.sendMessage(chatId, 'Заявок на вступление в группу нет');
        } else {
            const keyboard = [];
            for (const rtg of requestsToGroup) {
                const usr = await Users.findOne({ where: { USER_ID: rtg.REQUESTER_ID } });
                if (usr) {
                    keyboard.push([{ text: usr.USERNAME, callback_data: `show_user_request_${usr.USER_ID}_${groupId}` }]);
                }
            }
            keyboard.push([{ text: 'Назад', callback_data: `show_group_menu_${groupId}` }]);

            // Вывод заявок на вступление в группу в виде кнопок:
            bot.sendMessage(chatId, 'Список заявок на вступление в группу:', {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
        }
    } catch (error) {
        console.log('Ошибка при отображении списка заявок на вступление в группу: ' + error);
        bot.sendMessage(chatId, 'Ошибка при отображении списка заявок на вступление в группу');
    }
    showGroupInfo(chatId, groupId);
    return;
};

const handleAlarmAll = async (chatId) => {	
		bot.sendMessage(chatId, 'Напишите сообщение для каждого пользователя ("Назад", чтобы вернуться в главное меню): ');
		setState(chatId, 'WAITING_ALARM_ALL');
}

const handleAlarmGroup = async (chatId) => {
	bot.sendMessage(chatId, 'Введите название группы, участникам которой будут направлены сообщения (Либо "Назад"): ');
	await setState(chatId, 'ALARM_GROUP_STATE');
};

const handleAlarmUser = async (chatId) => {
	bot.sendMessage(chatId, 'Введите telegram ID пользователя, которому нужно направить уведомление (Либо "Назад"): ');
	await setState(chatId, 'ALARM_USER_STATE');
};

const handleShowUserRequest = async (chatId, grId, reqId) => {
try {
		const grName = await GroupStud.findOne({where: {GROUP_ID: grId}});
        const usr = await GroupRequests.findOne({ where: { REQUESTER_ID: reqId, GROUP_NAME: grName.GROUP_NAME, IS_APPROVED: false } });
        if (!usr) {
            bot.sendMessage(chatId, 'Пользователь не найден');
        } else {
            // Вывод информации о пользователе и кнопок (Принять) (Удалить) (Назад):
            bot.sendMessage(chatId, `Выберите действие:`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Принять заявку', callback_data: `accept_request_group_${reqId}_${grId}` }],
                        [{ text: 'Удалить заявку', callback_data: `reject_request_group_${reqId}_${grId}` }],
                        [{ text: 'Назад', callback_data: `show_group_menu_${grId}` }]
                    ]
                }
            });
        }
    } catch (error) {
        console.log('Ошибка при просмотре профиля пользователя, подавшего заявку ' + error);
        bot.sendMessage(chatId, 'Ошибка при просмотре профиля пользователя, подавшего заявку');
    }
    showGroupInfo(chatId, grId);
    return;
};

const handleDeleteEvent = async (chatId, eventId) => {
    await Events.destroy({ where: { EVENT_ID: eventId } });
	bot.sendMessage(chatId, 'Мероприятие успешно удалено.');
    // Отправляем обновленный список мероприятий после удаления
    handleShowAllEvents(chatId);
};

const handleAcceptRequestGroup = async (chatId, grId, reqId) => {
	try {
			const grName = await GroupStud.findOne({where: {GROUP_ID: grId}});
			const usr = await GroupRequests.findOne({where: {REQUESTER_ID: reqId, GROUP_NAME: grName.GROUP_NAME, IS_APPROVED: false}});
			if (!usr) {
				bot.sendMessage(chatId, 'Пользователь не найден');
			} else {
				await GroupRequests.update({IS_APPROVED: true}, {where: {REQUESTER_ID: reqId, GROUP_NAME: grName.GROUP_NAME, IS_APPROVED: false}});
				await UserGroups.create({
					USER_ID: reqId,
					GROUP_ID: grId,
					ROLE: 'student'
				});
				bot.sendMessage(chatId, 'Студент успешно зачислен в группу!');
			}
		} catch (error) {
			console.log('Ошибка при просмотре профиля пользователя, подавшего заявку');
			bot.sendMessage(chatId, 'Ошибка при просмотре профиля пользователя, подавшего заявку');
		}
		showGroupInfo(chatId, grId);
		return;
};

const handleRejectRequestGroup = async (chatId, grId, reqId) => {
	try {
			const grName = await GroupStud.findOne({where: {GROUP_ID: grId}});
			const usr = await GroupRequests.findOne({where: {REQUESTER_ID: reqId, GROUP_NAME: grName.GROUP_NAME, IS_APPROVED: false}});
			if (!usr) {
				bot.sendMessage(chatId, 'Пользователь не найден');
			} else {
				await GroupRequests.destroy({where: {REQUESTER_ID: reqId, GROUP_NAME: grName.GROUP_NAME, IS_APPROVED: false}});
				bot.sendMessage(chatId, 'Заявка успешно отклонена и удалена');
			}
		} catch (error) {
			console.log('Ошибка при просмотре профиля пользователя, подавшего заявку');
			bot.sendMessage(chatId, 'Ошибка при просмотре профиля пользователя, подавшего заявку');
		}
		showGroupInfo(chatId, grId);
		return;
};

const handleAddInSchedule = async (chatId, grId, subjId) => {
	bot.sendMessage(chatId, 'Введите дату и время по шаблону(или "назад"):\n[Дата YYYY-MM-DD]\n[Время HH:MM:SS]');
	bot.sendMessage(chatId, 'Например,\n2024-08-31\n12:30:00');
	await setState(chatId, 'ADD_DATE_TIME_SUBJECT', {groupId: grId, subjectId: subjId});
};

const handleDeleteFromSchedule = async (chatId, grId, subjId) => {
    try {
        // Удаление записи из расписания
        await Schedule.destroy({ where: { GROUP_ID: grId, SUBJECT_ID: subjId } });

        // Удаление предмета из таблицы Subjects
        await Subjects.destroy({ where: { SUBJECT_ID: subjId } });

        // Информирование пользователя об успешном удалении
        bot.sendMessage(chatId, 'Предмет успешно удалён из расписания и базы данных.');
    } catch (error) {
        console.error('Ошибка удаления предмета:', error);
        bot.sendMessage(chatId, 'Ошибка удаления предмета');
    } finally {
        // Вернуть в меню группы после завершения
        showGroupInfo(chatId, grId);
    }
};

const handleDeleteSubjectFromSchedule = async (chatId, grId) => {
	const getRightsOfParticipant = await Users.findOne({where: {TELEGRAM_ID: chatId}});
	if (!getRightsOfParticipant) {
		bot.sendMessage(chatId, 'Пользователь не найден');
		await showGroupInfo(chatId, grId);
	} else {
		const getRoleOP = await UserGroups.findOne({where: {USER_ID: getRightsOfParticipant.USER_ID, GROUP_ID: grId}});
		if (getRoleOP.ROLE !== 'student') {
		bot.sendMessage(chatId, 'Введите дату, время и предмет по шаблону удаляемого предмета(или "назад"):\n[Дата YYYY-MM-DD]\n[Время HH:MM:SS]\n[Название предмета]');
		bot.sendMessage(chatId, 'Например,\n2024-08-31\n12:30:00\nРусский язык');
		console.log('GROUP_ID FROM handleDeleteSubjectFromSchedule: ' + grId);
		await setState(chatId, 'DEL_DATE_TIME_SUBJECT', {groupId: grId});
		} else {
			bot.sendMessage(chatId, 'Недостаточно прав');
			await showGroupInfo(chatId, grId);
		}
	}
};
// Обработка нажатий на кнопки
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;
	console.log(action);
    if (action.startsWith('group_')) { // +
        const groupId = parseInt(action.replace('group_', ''));
        handleGroupRequestsMenu(chatId, groupId);
    }
	else if (action === 'back_to_requests') { // +
        // Вызов функции для отображения списка заявок на создание групп
        await handleGroupRequests(chatId);
    } 
	else if (action.startsWith('accept_group_')) { // +
        const groupId = parseInt(action.replace('accept_group_', ''));
		await handleAcceptGroupRequest(chatId, groupId);
    } 
	else if (action.startsWith('reject_group_')) { // +
        const groupId = parseInt(action.replace('reject_group_', ''));
        await handleRejectGroupRequest(chatId, groupId);
    } 
	else if (action.startsWith('approved_group_')) { // +
		//Была выбрана конкретная учебная группа для подачи заявки
		const groupId = parseInt(action.replace('approved_group_', ''));
		await handleApprovedGroups(chatId, groupId);
	} 
	else if (action === 'back_main') { // +
		showMainMenu(chatId);
		return;
	} 
	else if (action.startsWith('enter_group_')) { // +
        const groupId = parseInt(action.replace('enter_group_', ''));
        await handleEnterGroup(chatId, groupId);
	}
	else if (action.startsWith('get_info_')) { // +
    const groupId = parseInt(action.replace('get_info_', ''));
	await handleGetInfoAboutGroup(chatId, groupId);
	}
	else if (action.startsWith('change_role_')) { // +
		const act = action.replace('change_role_', '');
		const userId = parseInt(act.split('_')[0]);
		const groupId = parseInt(act.split('_')[1]);
		await handleChangeRole(chatId, groupId, userId);
	}
	else if (action.startsWith('make_')) { // +
		await handleChangeUserRole(action, chatId);
	}
	else if (action === 'show_all_events') { // ??
    await handleShowAllEvents(chatId);
	}
	else if (action === 'create_event') { // +
       await handleCreateEvent(chatId);
    } 
	else if (action.startsWith('show_group_menu_')) { // +
		const grId = parseInt(action.replace('show_group_menu_', ''));
		await showGroupInfo(chatId, grId);
	} 
	else if (action.startsWith('show_schedule_')) { // ? ** Расписание в виде картинки нужно добавить
		const grId = parseInt(action.replace('show_schedule_', ''));
		await handleShowSchedule(chatId, grId);
	}
	else if (action.startsWith('actual_tasks_')) { // +
		const grId = parseInt(action.replace('actual_tasks_', '')); //group id
		await handleShowActualTasks(chatId, grId);
	}
	else if (action.startsWith('delete_task_')) { // +
        const actionParts = action.replace('delete_task_', '').split('_');
        const tskId = parseInt(actionParts[0]);
        const grId = parseInt(actionParts[1]);
		await handleDeleteTask(chatId, grId, tskId);
	}
	else if (action.startsWith('cancel_offer_task_to_group_')) { // +
		const tskId = parseInt(action.replace('cancel_offer_task_to_group_', '').split('_')[0]);
		const grId = parseInt(action.replace('cancel_offer_task_to_group_', '').split('_')[1]);
		await handleCancelOfferTaskToGroup(chatId, grId, tskId);
	}
	else if (action.startsWith('offer_task_to_group_')) { // +
		const tskId = parseInt(action.replace('offer_task_to_group_', '').split('_')[0]);
		const grId = parseInt(action.replace('offer_task_to_group_', '').split('_')[1]);
		await handleOfferTaskToGroup(chatId, grId, tskId);
	}
	else if (action.startsWith('complete_task_')) { // +
		const tskId = parseInt(action.replace('complete_task_', '').split('_')[0]);
		const grId = parseInt(action.replace('complete_task_', '').split('_')[1]);
		await handleCompleteTask(chatId, grId, tskId);
	}
	else if (action.startsWith('add_task_')) { // +
		const grId = parseInt(action.replace('add_task_', '')); // group id
		await handleAddTask(chatId, grId);
	}
	else if (action.startsWith('add_subject_')) { // -
		const grId = parseInt(action.replace('add_subject_', '')); //group id
		await handleAddSubject(chatId, grId);
	}
	else if (action.startsWith('requests_tasks_')) { // +
		const grId = parseInt(action.replace('requests_tasks_', '')); //group id
		await handleListRequestsTasks(chatId, grId);
	}
	else if (action.startsWith('reject_request_task_')) { // +
		const tskId = parseInt(action.replace('reject_request_task_', '').split('_')[0]);
		const grId = parseInt(action.replace('reject_request_task_', '').split('_')[1]);
		await handleRejectTaskFromList(chatId, grId, tskId);
	}
	else if (action.startsWith('approve_request_task_')) { // +
		const tskId = parseInt(action.replace('approve_request_task_', '').split('_')[0]);
		const grId = parseInt(action.replace('approve_request_task_', '').split('_')[1]);
		await handleApproveTaskFromList(chatId, grId, tskId);
	}
	else if (action.startsWith('subject_list_')) { // - hard
		const grId = parseInt(action.replace('subject_list_', '')); //group id
		await handleSubjectList(chatId, grId);
	}
	else if (action.startsWith('go_to_subject_menu_')) {
		const clearAction = action.replace('go_to_subject_menu_', '');
		const subjId = parseInt(clearAction.split('_')[0]);
		const grId = parseInt(clearAction.split('_')[1]);
		await handleSubjectMenu(chatId, subjId, grId);
	}
	else if (action.startsWith('requests_join_')) { // +
		const groupId = parseInt(action.replace('requests_join_', '')); // group id
		await handleRequestsJoin(chatId, groupId);
	}
	else if (action.startsWith('send_notification_')) { // +
		const grId = parseInt(action.replace('send_notification_', '')); //group id
		const usr = await Users.findOne({where: {TELEGRAM_ID: chatId}});
		if(!usr) {
			bot.sendMessage(chatId, 'Пользователь не найден');
		} else {
			const usrgr = await UserGroups.findOne({where: {USER_ID: usr.USER_ID, GROUP_ID: grId}});
			if (!usrgr) {
				bot.sendMessage(chatId, 'Пользователь не состоит в группе!');
			} else {
				if (usrgr.ROLE !== 'student') {
					bot.sendMessage(chatId, 'Введите сообщение для группы (либо "Назад"):');
					await setState(chatId, 'GROUP_NOTIFICATE', {groupId: grId});
				} 
				else {
					bot.sendMessage(chatId, 'Недостаточно прав для отправки уведомлений');
					showGroupInfo(chatId, grId);
					return;
				}
			}
		}

	} 
	else if (action === 'alarm_all') { // +
		await handleAlarmAll(chatId);
	}
	else if (action === 'alarm_group') { // +
		await handleAlarmGroup(chatId);
	}
	else if (action === 'alarm_user') { // +
		await handleAlarmUser(chatId);
	}
	else if (action.startsWith('show_user_request_')) { // +
    const words = action.replace('show_user_request_', '');
    const reqId = parseInt(words.split('_')[0]);
    const grId = parseInt(words.split('_')[1]);
    await handleShowUserRequest(chatId, grId, reqid);
}
	else if (action.startsWith('delete_event_')) { // +
        const eventId = action.replace('delete_event_', '');
		await handleDeleteEvent(chatId, eventId);
    }
	else if (action.startsWith('accept_request_group_')) { // +
		const words = action.replace('accept_request_group_', '');
		const reqId = parseInt(words.split('_')[0]);
		const grId = parseInt(words.split('_')[1]);
		await handleAcceptRequestGroup(chatId, grId, reqId);
	}
	else if (action.startsWith('reject_request_group_')) { // +
		const words = action.replace('reject_request_group_', '');
		const reqId = parseInt(words.split('_')[0]);
		const grId = parseInt(words.split('_')[1]);
		await handleRejectRequestGroup(chatId, grId, reqId);
	}
	else if (action === 'create_group') { // +
		await handleCreateGroup(chatId);
	}
	else if (action === 'requests_on_create_group') { // +
		await handleGroupRequests(chatId);
	}
	else if (action === 'info_my_groups') { // +
		await handleMyGroupsInfo(chatId);
	}
	else if (action === 'join_to_group') { // +
		await handleJoinGroup(chatId);
	}
	else if (action === 'notif') { // +
		await handleNotification(chatId);
	}
	else if (action === 'events') { // +
		await handleEvent(chatId);
	}
	else if (action.startsWith('show_event_')) {
		const eventId = parseInt(action.replace('show_event_', ''));
		
    try {
        // Получаем информацию о мероприятии из базы данных
        const event = await sequelize.query(
            'SELECT * FROM EVENTS WHERE EVENT_ID = :eventId',
            {
                replacements: { eventId },
                type: QueryTypes.SELECT
            }
        );

        // Проверяем, что мероприятие найдено
        if (event.length === 0) {
            bot.sendMessage(chatId, 'Мероприятие не найдено.');
        } else {
            const eventData = event[0]; 

            // Формируем сообщение с информацией о мероприятии
            const message = `Название: ${eventData.EVENT_NAME}\n` +
                            `Дата: ${eventData.EVENT_DATE}\n` +
                            `Время: ${eventData.EVENT_TIME}\n` +
                            `Место: ${eventData.LOCATION}\n` +
                            `Описание: ${eventData.DESCRIPTION}`;

            bot.sendMessage(chatId, message);
        }
    } catch (error) {
        console.error('Ошибка при получении информации о мероприятии:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при получении информации о мероприятии.');
    }
	handleShowAllEvents(chatId);
	}
	else if (action.startsWith('add_in_schedule_')) {
		const grId = parseInt(action.replace('add_in_schedule_', '').split('_')[0]);
		const subjId = parseInt(action.replace('add_in_schedule_', '').split('_')[1]);
		await handleAddInSchedule(chatId, grId, subjId);
	}
	else if (action.startsWith('delete_subject_from_schedule_')) {
		const grId = parseInt(action.replace('delete_subject_from_schedule_', ''));
		console.log('grId from delete_subject_from_schedule: ' + grId);
		await handleDeleteSubjectFromSchedule(chatId, grId);
	}
	else if (action.startsWith('delete_subject_')) {
		//delete_subject_${groupId}_${subjId}
		const grId = parseInt(action.replace('delete_subject_', '').split('_')[0]);
		const subjId = parseInt(action.replace('delete_subject_', '').split('_')[1]);
		await handleDeleteFromSchedule(chatId, grId, subjId);
	}
	
});

// Функция для обработки информации о моих группах +
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

// Функция для обработки заявки на вступление в группу +
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

// Функция для отправки уведомления о мероприятии +
const sendNotificationEvent = async (userId, message) => {
    try {
        await bot.sendMessage(userId, message);
    } catch (error) {
        console.error('Ошибка при отправке уведомления:', error);
    }
};

// Функция для проверки и отправки уведомлений о мероприятиях +
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

// cron-расписание для каждого мероприятия (7, 3, 2, 1 день до их начала) +
cron.schedule('0 9 * * *', () => { // Выполняется каждый день в 0 минут, 9 часов.
	checkAndSendNotificationsEvents(7);
    checkAndSendNotificationsEvents(3);
    checkAndSendNotificationsEvents(2);
    checkAndSendNotificationsEvents(1);
});

// Функция для отправки уведомлений о дедлайне задач
async function checkAndSendTaskNotifications(daysBeforeDeadline) {
    try {
        const date = new Date();
        date.setDate(date.getDate() + daysBeforeDeadline);
        const targetDate = date.toISOString().split('T')[0]; // Получаем дату в формате YYYY-MM-DD

        // Ищем задачи, у которых DEADLINE совпадает с targetDate
        const tasks = await Tasks.findAll({
            where: {
                DEADLINE: targetDate,
				FOR_ALL: false
            }
        });

        for (const task of tasks) {
            const user = await Users.findOne({ where: { USER_ID: task.USER_ID } });
            if (user) {
                const chatId = user.TELEGRAM_ID;

                // Отправка уведомления
                sendNotification(chatId, `У вас есть задача с дедлайном через ${daysBeforeDeadline} дней: ${task.TITLE}`);
            }
        }
    } catch (error) {
        console.error('Ошибка при отправке уведомлений о задачах:', error);
    }
}

// Добавляем расписание cron для отправки уведомлений о дедлайне задач каждому пользователю, который записан в USER_ID
cron.schedule('0 9 * * *', () => { // Выполняется каждый день в 0 минут, 9 часов.
    checkAndSendTaskNotifications(7);
    checkAndSendTaskNotifications(3);
    checkAndSendTaskNotifications(2);
    checkAndSendTaskNotifications(1);
});

// Отправка уведомлений
function sendNotification(chatId, message) {
    console.log(`Отправка уведомления пользователю ${chatId}: ${message}`);
}