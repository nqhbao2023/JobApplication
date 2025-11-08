import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import {StyleSheet} from 'react-native';
import {useState} from 'react';
export default function LoginTest(){
    //State trang thai de giu email,password nguoi dung nhap
    const [email, setEmail] =useState('');
    const [password, setPassword] = useState('');

    const handleLogin =()=>{
        console.log('Email:', email);
        console.log('Password:' ,password);
    };

    return (
        <KeyboardAvoidingView 
        style= {styles.container}
        behavior= { Platform.OS === 'android'? 'padding' : undefined}
        
        >

        
        </KeyboardAvoidingView>

    );
};
const styles =StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

})