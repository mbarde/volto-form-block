import React, { useState, useEffect, useReducer } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { useIntl, defineMessages } from 'react-intl';
import { submitForm } from '../actions';
import { getFieldName } from './utils';
import FormView from 'volto-form-block/components/FormView';

const messages = defineMessages({
  formSubmitted: {
    id: 'formSubmitted',
    defaultMessage: 'Form successfully submitted',
  },
});

const initialState = {
  loading: false,
  error: null,
  result: null,
};

const FORM_STATES = {
  normal: 'normal',
  loading: 'loading',
  error: 'error',
  success: 'success',
};

const formStateReducer = (state, action) => {
  switch (action.type) {
    case FORM_STATES.normal:
      return initialState;

    case FORM_STATES.loading:
      return { loading: true, error: null, result: null };

    case FORM_STATES.error:
      return { loading: false, error: action.error, result: null };

    case FORM_STATES.success:
      return { loading: false, error: null, result: action.result };

    default:
      return initialState;
  }
};

/**
 * Form
 * @class Form
 * @extends Component
 */
const Form = ({ data, id, path }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const { static_fields = [] } = data;

  const [formData, setFormData] = useReducer(
    (state, action) => {
      return {
        ...state,
        [action.field]: action.value,
      };
    },
    {
      ...static_fields.reduce(
        (acc, field) => ({ ...acc, [getFieldName(field.label)]: field }),
        {},
      ),
    },
  );

  const [formState, setFormState] = useReducer(formStateReducer, initialState);
  const [formErrors, setFormErrors] = useState([]);
  const submitResults = useSelector((state) => state.submitForm);

  const onChangeFormData = (field_id, field, value, label) => {
    setFormData({ field, value: { field_id, value, label } });
  };

  useEffect(() => {
    if (formErrors.length > 0) {
      isValidForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const isValidForm = () => {
    let v = [];
    data.subblocks.forEach((subblock, index) => {
      let name = getFieldName(subblock.label);
      if (
        subblock.required &&
        (!formData[name] || formData[name]?.length === 0)
      ) {
        v.push(name);
      }
    });

    setFormErrors(v);
    return v.length === 0;
  };

  const submit = (e) => {
    e.preventDefault();

    if (isValidForm()) {
      let attachments = {};

      data.subblocks.forEach((subblock, index) => {
        let name = getFieldName(subblock.label);
        if (formData[name]?.value) {
          formData[name].field_id = subblock.field_id;
          const isAttachment = subblock.field_type === 'attachment';

          if (isAttachment) {
            attachments[name] = formData[name].value;
          }
        }
      });

      dispatch(
        submitForm(
          path,
          id,
          Object.keys(formData).map((name) => ({
            field_id: formData[name].field_id,
            label: formData[name].label,
            value: formData[name].value,
          })),
          attachments,
        ),
      );
      setFormState({ type: FORM_STATES.loading });
    } else {
      setFormState({ type: FORM_STATES.error });
    }
  };

  useEffect(() => {
    if (submitResults?.loaded) {
      setFormState({
        type: FORM_STATES.success,
        result: intl.formatMessage(messages.formSubmitted),
      });
    } else if (submitResults?.error) {
      let errorDescription = `${submitResults.error.status} ${
        submitResults.error.message
      }- ${JSON.parse(submitResults.error.response?.text ?? {})?.message}`;

      setFormState({ type: FORM_STATES.error, error: errorDescription });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitResults]);

  return (
    <FormView
      formState={formState}
      formErrors={formErrors}
      formData={formData}
      onChangeFormData={onChangeFormData}
      data={data}
      onSubmit={submit}
    />
  );
};

/**
 * Property types.
 * @property {Object} propTypes Property types.
 * @static
 */
Form.propTypes = {
  data: PropTypes.objectOf(PropTypes.any).isRequired,
};

export default Form;
