import 'app/index';
import { checkReadyForRepetition } from 'app/js/intervalRepeatMethod';
import performRequests from 'app/js/utils/perform-requests';
import api from 'app/js/api';
import settings from 'app/js/settings';
import '../scss/main.scss';
import './animate';

import settingsPage from './settingsPage';

const processData = (data) => {
  const [responseResults] = data;
  const [results] = responseResults;
  const { paginatedResults } = results;

  // console.log('paginatedResults;: ', paginatedResults);
  return paginatedResults;
};

api.checkLogin().then(async () => {
  await settings.getSettings();
  const params = {
    wordsPerPage: 3600,
    filter: {
      $and: [
        {
          $nor: [{ userWord: null }],
        },
        {
          'userWord.optional.degreeOfKnowledge': {
            $lt: 5,
          },
        },
      ],
    },
  };

  const wordsResponse = await performRequests([api.getUsersAggregatedWords.bind(api, params)]);
  const words = processData(wordsResponse);
  const promisesForUpdateWords = [];
  words.forEach((word) => {
    const {
      _id: id,
      userWord: {
        difficulty,
        optional: {
          countRepetition, isDelete, isHard, lastRepetition, degreeOfKnowledge, becameLearned,
        },
      },
    } = word;

    const isReadyToRepeat = checkReadyForRepetition(degreeOfKnowledge, lastRepetition);
    // console.log('word: ', word);
    // console.log('isReadyToRepeat: ', isReadyToRepeat);

    promisesForUpdateWords.push(
      api.updateUserWordById.bind(api, id, {
        difficulty,
        optional: {
          countRepetition,
          isDelete,
          isHard,
          isReadyToRepeat,
          lastRepetition,
          degreeOfKnowledge,
          becameLearned,
        },
      }),
    );
  });

  await performRequests(promisesForUpdateWords);

  document.querySelector('.opportunities-menu__item-on').classList.toggle('d-none', settings.isGlobalMute);
  document.querySelector('.opportunities-menu__item-off').classList.toggle('d-none', !settings.isGlobalMute);

  settingsPage.init();
}, () => {
  window.location.href = '/';
});
