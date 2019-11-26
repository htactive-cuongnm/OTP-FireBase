import React, {Component} from 'react';
import {
  View,
  Button,
  Text,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';

import firebase from 'react-native-firebase';

export default class PhoneAuth extends Component {
  static getDefaultState() {
    return {
      error: '',
      codeInput: '',
      phoneNumber: '',
      auto: Platform.OS === 'android',
      autoVerifyCountDown: 0,
      sent: false,
      started: false,
      user: null,
      password: '',
      passwordCheck: '',
    };
  }

  constructor(props) {
    super(props);
    this.unsubscribe = null;
    this.timeout = 20;
    this._autoVerifyInterval = null;
    this.state = PhoneAuth.getDefaultState();
  }
  componentDidMount() {
    let pass = {};
    this.unsubscribe = firebase
      .database()
      .ref('password')
      .on('value', val => {
        pass = val && val.val();
        this.setState(() => {
          return {
            passwordCheck: pass,
          };
        });
      });
  }
  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  _tick() {
    this.setState({
      autoVerifyCountDown: this.state.autoVerifyCountDown - 1,
    });
  }

  afterVerify = () => {
    const {codeInput, verificationId} = this.state;
    const credential = firebase.auth.PhoneAuthProvider.credential(
      verificationId,
      codeInput,
    );

    firebase
      .auth()
      .signInWithCredential(credential)
      .then(user => {
        this.setState({user: 'thuan ho'});
      })
      .catch(() => {
        this.setState({error: 'lỗi OTP không chính xác'});
      });
  };

  signIn = () => {
    const {phoneNumber, password, passwordCheck} = this.state;
    if (phoneNumber.length < 0 || phoneNumber === '') {
      this.setState({
        error: 'Vui lòng nhập thông tin tài khoản',
      });
      this.refs.account.focus();
    } else if (password.length < 0 || password === '') {
      this.setState({
        error: 'Vui lòng nhập mật khẩu',
      });
      this.refs.password.focus();
    } else if (password !== passwordCheck) {
      this.setState({
        error: 'Mật khẩu không đúng',
      });
    } else {
      this.setState(
        {
          started: true,
          autoVerifyCountDown: this.timeout,
          error: '',
        },
        () => {
          firebase
            .auth()
            .verifyPhoneNumber(`+84${phoneNumber}`)
            .on('state_changed', phoneAuthSnapshot => {
              switch (phoneAuthSnapshot.state) {
                case firebase.auth.PhoneAuthState.CODE_SENT:
                  this.setState(
                    {
                      sent: true,
                      verificationId: phoneAuthSnapshot.verificationId,
                      autoVerifyCountDown: this.timeout,
                    },
                    () => {
                      if (this.state.auto) {
                        this._autoVerifyInterval = setInterval(
                          this._tick.bind(this),
                          1000,
                        );
                      }
                    },
                  );
                  break;
                case firebase.auth.PhoneAuthState.ERROR:
                  clearInterval(this._autoVerifyInterval);
                  this.setState({
                    ...PhoneAuth.getDefaultState(),
                    error: phoneAuthSnapshot.error.message,
                  });
                  break;
                case firebase.auth.PhoneAuthState.AUTO_VERIFY_TIMEOUT:
                  clearInterval(this._autoVerifyInterval);
                  this.setState({
                    sent: true,
                    auto: false,
                    verificationId: phoneAuthSnapshot.verificationId,
                  });
                  break;
                case firebase.auth.PhoneAuthState.AUTO_VERIFIED:
                  clearInterval(this._autoVerifyInterval);
                  this.setState({
                    sent: true,
                    codeInput: phoneAuthSnapshot.code,
                    verificationId: phoneAuthSnapshot.verificationId,
                  });
                  break;
                default:
                  this.setState({
                    error: 'Lỗi éo bik',
                  });
              }
            });
        },
      );
    }
  };

  renderPhoneNumberInput() {
    const {phoneNumber, passwordCheck} = this.state;

    return (
      <View style={{padding: 25}}>
        <Text>SỐ ĐT:</Text>
        <TextInput
          autoFocus
          style={{
            height: 40,
            marginTop: 15,
            marginBottom: 15,
            borderBottomColor: 'black',
            borderWidth: 1,
            borderRadius: 5,
            padding: 10,
          }}
          keyboardType={'numeric'}
          onChangeText={value => this.setState({phoneNumber: value})}
          placeholder={'Nhập SĐT'}
          value={phoneNumber}
          ref="account"
          returnKeyType={'next'}
          onSubmitEditing={() => {
            this.refs.password.focus();
          }}
        />
        <Text>MẬT KHẨU:</Text>
        <TextInput
          style={{
            height: 40,
            marginTop: 15,
            marginBottom: 15,
            borderBottomColor: 'black',
            borderWidth: 1,
            borderRadius: 5,
            padding: 10,
          }}
          ref="password"
          onChangeText={value => this.setState({password: value})}
          placeholder={`Nhập mật khẩu là ${passwordCheck} từ firebase`}
        />
        <Button
          title="Xác nhận"
          color="green"
          onPress={this.signIn}
          style={{borderRadius: 5, borderColor: 'grey', borderWidth: 1}}
        />
      </View>
    );
  }

  signOut = () => {
    firebase.auth().signOut();
    this.setState({
      error: '',
      codeInput: '',
      phoneNumber: '',
      auto: Platform.OS === 'android',
      autoVerifyCountDown: 0,
      sent: false,
      started: false,
      user: null,
      password: '',
    });
  };

  renderSendingCode() {
    const {phoneNumber} = this.state;

    return (
      <View
        style={{
          paddingBottom: 15,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Text style={{paddingBottom: 25, fontWeight: 'bold', fontSize: 20}}>
          {`Đang gửi mã OTP '${phoneNumber}'.`}
        </Text>
        <ActivityIndicator animating style={{padding: 50}} size="large" />
      </View>
    );
  }

  renderAutoVerifyProgress() {
    const {autoVerifyCountDown, started, error, sent, phoneNumber} = this.state;
    if (!sent && started && !error.length) {
      return this.renderSendingCode();
    }
    return (
      <View style={{padding: 0}}>
        <Text style={{paddingBottom: 25}}>
          {`OTP đã gửi thành công '${phoneNumber}'.`}
        </Text>
        <Text style={{marginBottom: 25}}>
          {`chuyển tran trong ${autoVerifyCountDown} giây.`}
        </Text>
        <Button
          style={{paddingTop: 25}}
          title="Đã có mã"
          color="green"
          onPress={() => this.setState({auto: false})}
        />
      </View>
    );
  }

  renderError() {
    const {error} = this.state;

    return (
      <View
        style={{
          padding: 10,
          borderRadius: 5,
          margin: 10,
          backgroundColor: 'rgb(255,0,0)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Text style={{color: '#fff'}}>{error}</Text>
      </View>
    );
  }

  back = () => {
    this.setState({
      error: '',
      codeInput: '',
      auto: Platform.OS === 'android',
      autoVerifyCountDown: 0,
      sent: false,
      started: false,
      user: null,
    });
  };

  render() {
    const {started, error, codeInput, sent, auto, user} = this.state;
    return (
      <View style={{flex: 1, padding: 10}}>
        <Text style={{fontSize: 25, marginBottom: 20}}>Bài tập OTP</Text>
        {!started && !sent ? this.renderPhoneNumberInput() : null}
        {started && auto && !codeInput.length
          ? this.renderAutoVerifyProgress()
          : null}
        {!user && started && sent && (codeInput.length || !auto) ? (
          <View
            style={{
              marginTop: 15,
              flex: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
            }}>
            <View style={{width: '100%'}}>
              <Text>NHẬP OTP:</Text>
              <TextInput
                autoFocus
                style={{
                  height: 40,
                  marginTop: 15,
                  marginBottom: 15,
                  borderWidth: 1,
                  borderColor: 'black',
                  borderRadius: 5,
                  padding: 10,
                }}
                onChangeText={value => this.setState({codeInput: value})}
                placeholder="Nhập OTP ... "
                value={codeInput}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                width: '100%',
                justifyContent: 'space-between',
              }}>
              <Button
                title="Hủy"
                color="#841584"
                style={{borderRadius: 5, width: '48%'}}
                onPress={this.back}
              />
              <Button
                title="Xác nhận"
                style={{borderRadius: 5, width: '48%'}}
                color="#841584"
                onPress={this.afterVerify}
              />
            </View>
          </View>
        ) : null}
        {!user && error && error.length ? this.renderError() : null}
        {user ? (
          <View
            style={{
              marginTop: 15,
              padding: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontWeight: 'bold',
                fontSize: 30,
                marginBottom: 30,
              }}>{`Đăng nhập thành công hello: '${this.state.user}'`}</Text>
            <Button title="Sign Out" color="red" onPress={this.signOut} />
          </View>
        ) : null}
      </View>
    );
  }
}
