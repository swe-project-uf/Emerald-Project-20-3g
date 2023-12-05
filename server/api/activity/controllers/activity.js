'use strict';

const { sanitizeEntity } = require('strapi-utils/lib');

const SCIENCE = 1;
const MAKING = 2;
const COMPUTATION = 3;

module.exports = {
  // update activity description and objective
  async update(ctx) {
    const { id } = ctx.params;

    // ensure request was not sent as formdata
    if (ctx.is('multipart'))
      return ctx.badRequest('Multipart requests are not accepted!', {
        id: 'activity.update.format.invalid',
        error: 'ValidationError',
      });

    // validate the request
    const {
      description,
      images,
      StandardS,
      link,
      youtubeLink,
      scienceComponents,
      makingComponents,
      computationComponents,
    } = ctx.request.body;
    if (!StandardS || !description)
      return ctx.badRequest('A description, Standards must be provided!', {
        id: 'activity.update.body.invalid',
        error: 'ValidationError',
      });

    // array to store new component
    let activityComponents = [];

    // add the science components
    scienceComponents.forEach(async (component) => {
      let word = component.trim();
      word = word.charAt(0).toUpperCase() + word.slice(1);
      // find the existing components first
      let foundComponent = await strapi.services['learning-components'].findOne(
        { type: word, learning_component_type: SCIENCE }
      );
      if (foundComponent) {
        activityComponents.push(foundComponent);
      }
      // if component not found, create new ones
      else {
        const newComponent = await strapi.services[
          'learning-components'
        ].create({
          type: word,
          activities: id,
          learning_component_type: SCIENCE,
        });
        activityComponents.push(newComponent);
      }
    });

    // add the making components
    makingComponents.forEach(async (component) => {
      let word = component.trim();
      word = word.charAt(0).toUpperCase() + word.slice(1);
      let foundComponent = await strapi.services['learning-components'].findOne(
        { type: word, learning_component_type: MAKING }
      );
      if (foundComponent) {
        activityComponents.push(foundComponent);
      } else {
        const newComponent = await strapi.services[
          'learning-components'
        ].create({
          type: word,
          activities: id,
          learning_component_type: MAKING,
        });
        activityComponents.push(newComponent);
      }
    });

    // add the computation components
    computationComponents.forEach(async (component) => {
      let word = component.trim();
      word = word.charAt(0).toUpperCase() + word.slice(1);
      let foundComponent = await strapi.services['learning-components'].findOne(
        { type: word, learning_component_type: COMPUTATION }
      );
      if (foundComponent) {
        activityComponents.push(foundComponent);
      } else {
        const newComponent = await strapi.services[
          'learning-components'
        ].create({
          type: word,
          activities: id,
          learning_component_type: COMPUTATION,
        });
        activityComponents.push(newComponent);
      }
    });

    const updatedActivity = await strapi.services.activity.update(
      { id },
      { description, images, StandardS, link, youtubeLink, learning_components: activityComponents }
    );
    return sanitizeEntity(updatedActivity, { model: strapi.models.activity });
  },

  // Update activity template and block list
  async templateUpdate(ctx) {
    // find the activity
    const { id } = ctx.params;
    let activity = await strapi.services.activity.findOne({ id: id });
    if (!activity)
      return ctx.notFound(
        'The student id provided does not correspond to a valid student!',
        { id: 'activity.id.invalid', error: 'ValidationError' }
      );

    // update template and blocks
    activity.template = ctx.request.body.template;
    let unfriendlyBlocks = ctx.request.body.blocks;
    let friendlyBlocks = [];
    for (let i = 0; i < unfriendlyBlocks.length; i++) {
      let currentBlock = await strapi.services.block.findOne({
        name: unfriendlyBlocks[i],
      });
      friendlyBlocks.push(currentBlock);
    }
    activity.blocks = friendlyBlocks;

    const updatedActivity = await strapi.services.activity.update({ id: id }, activity);
    return sanitizeEntity(updatedActivity, { model: strapi.models.activity });
  },

  async toolbox(ctx) {
    const { id } = ctx.params;

    // get the blocks
    const blocks = await strapi.services.block.findByActivity(id);

    // return 404 if blocks is undefined
    // (only the case of an activity not existing)
    if (!blocks) return undefined;

    // return the activity id and the toolbox
    return {
      id,
      toolbox: strapi.services.block.blocksToToolbox(blocks),
    };
  },

  // Update activity template
  async activityTemplateUpdate(ctx) {
    // find the activity
    const { id } = ctx.params;
    let activity = await strapi.services.activity.findOne({ id: id });
    if (!activity)
      return ctx.notFound(
        'The student id provided does not correspond to a valid student!',
        { id: 'activity.id.invalid', error: 'ValidationError' }
      );

    // update template and blocks
    activity.activity_template = ctx.request.body.activity_template;

    const updatedActivity = await strapi.services.activity.update({ id: id }, activity);
    return sanitizeEntity(updatedActivity, { model: strapi.models.activity });
  },
};
